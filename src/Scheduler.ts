import { MessageEmbed, TextChannel } from "discord.js";
import { AiringSchedule, ThreadArchiveTime, TitleFormat } from "./Model";
import { getTitle, getUniqueMediaIds, query, readableFormat } from "./Util";
import { client, logger } from "./AniSchedule";
import { SCHEDULE_QUERY, SET_ACTIVITY, STREAMING_SITES } from "./Constants";
import { PrismaClient } from "@prisma/client";

const announcementTimouts: NodeJS.Timeout[] = [];
let queuedIds: number[] = [];

export async function initScheduler(prisma: PrismaClient) {
  // Clear any remaining announcements since we're about to remake them all
  // The only ones that should be left are any made when adding a new show to watch
  announcementTimouts.forEach(clearTimeout);

  // Current time in ms + 24 hours worth of ms
  const endTime = Date.now() + (24 * 60 * 60 * 1000);

  const uniqueIds = await getUniqueMediaIds(prisma);

  // Grab all the necessary announcements over the next 24 hours and schedule our own channel announcements
  await scheduleAnnouncements(uniqueIds, prisma, Date.now(), endTime);

  // Re-initialize the scheduler 1 minute before the end of the last tracked time window
  setTimeout(() => initScheduler(prisma), endTime - Date.now() - (60 * 1000));

  if (SET_ACTIVITY) {
    // Subsequent schedules will update the count
    client.user?.setActivity({ type: "WATCHING", name: `${uniqueIds.length} airing anime` });
  }
}

/**
 * Schedules announcements for the given media IDs so long as they have episodes airing in the given time window.
 * 
 * @param mediaIds The AniList IDs of the media
 * @param prisma An instance of {@link PrismaClient}
 * @param startTime The start of the time window in ms
 * @param endTime The end of the time window in ms
 */
export async function scheduleAnnouncements(mediaIds: number[], prisma: PrismaClient, startTime: number = Date.now(), endTime: number = Date.now() + (24 * 60 * 60 * 1000)) {
  const upcomingEpisodes = await getUpcomingEpisodes(mediaIds, startTime, endTime);
  upcomingEpisodes.forEach(e => {
    logger.info(`Scheduled announcement for ${e.media.title.romaji} at ${new Date(e.airingAt * 1000)}`);
    const timeout = setTimeout(() => sendAnnouncement(prisma, e), e.timeUntilAiring * 1000);
    announcementTimouts.push(timeout);
    queuedIds.push(e.media.id);
  });
}

/**
 * Gets upcoming episodes from the given media IDs in a period of time.
 * 
 * @param mediaIds The AniList IDs of the media
 * @param startTime The start of the time window in ms
 * @param endTime The end of the time window in ms
 */
export async function getUpcomingEpisodes(mediaIds: number[], startTime: number, endTime: number, pageInfo?: { page: number, perPage: number }): Promise<AiringSchedule[]> {
  startTime = Math.floor(startTime / 1000);
  endTime = Math.floor(endTime / 1000);

  const upcomingEpisodes: AiringSchedule[] = [];

  async function fetchSchedule(page: number = 1) {
    const response = (await query(SCHEDULE_QUERY, { 
      page: pageInfo ? pageInfo.page : page,
      amount: pageInfo ? pageInfo.perPage : undefined,
      ids: mediaIds,
      dateStart: startTime,
      nextDay: endTime
    })).data.Page;
    
    upcomingEpisodes.push(...response.airingSchedules as AiringSchedule[]);

    if (!pageInfo && response.pageInfo.hasNextPage)
      await fetchSchedule(page + 1);
  }

  await fetchSchedule();
  return upcomingEpisodes;
}

/**
 * Sends an episode announcement to all channels watching the the show
 * 
 * @param prisma An instance of {@link PrismaClient}
 * @param airing The airing schedule to announce
 */
export async function sendAnnouncement(prisma: PrismaClient, airing: AiringSchedule) {
  if (!queuedIds.includes(airing.media.id)) {
    logger.error(`Attempted to send an announcement for an ${airing.media.title.romaji} which is not in the queue. Skipping...`);
    return;
  }

  const announcements = await prisma.watchConfig.findMany({
    where: {
      anilistId: airing.media.id
    },
    distinct: [ "channelId", "anilistId" ]
  });

  if (announcements.length === 0) {
    logger.warn(`No announcements found for media ${airing.media.id}`);
    return;
  }

  for (const announcement of announcements) {
    const channel = await client.channels.fetch(announcement.channelId) as TextChannel;
    if (!channel) {
      logger.error(`Failed to fetch channel ${announcement.channelId}`);
      continue;
    }

    const serverConfig = await prisma.serverConfig.findFirst({
      rejectOnNotFound: true,
      where: {
        serverId: channel.guildId
      }
    });

    if (!serverConfig) {
      logger.error(`Failed to get server config for server ${channel.guildId}`);
      continue;
    }
    
    const roleMention = announcement.pingRole ? await channel.guild.roles.fetch(announcement.pingRole) : null;
    const message = await channel.send({
      content: roleMention ? `<@&${roleMention.id}>` : undefined,
      embeds: [ createAnnouncementEmbed(airing, serverConfig.titleFormat as TitleFormat) ]
    });
    logger.info(`Sent announcement for ${airing.media.title.romaji} to ${channel.guild.name}#${channel.name}`);
    try {
      if (announcement.createThreads) {
        message.startThread({
          name: `${getTitle(airing.media.title, serverConfig.titleFormat as TitleFormat)} Episode ${airing.episode} Discussion`,
          autoArchiveDuration: announcement.threadArchiveTime as ThreadArchiveTime
        });
      }
    } catch (e) {
      logger.error("Failed to create thread", e.message || e);
    }
  }

  // Remove the AniList ID from the queue to prevent duplicate announcements
  queuedIds = queuedIds.filter(id => id !== airing.media.id);

  // If this is the finale, set it as completed
  if (airing.media.episodes === airing.episode) {
    await prisma.watchConfig.updateMany({
      where: {
        anilistId: airing.media.id
      },
      data: {
        completed: true
      }
    });
    logger.info(`Detected final episode of ${airing.media.title.romaji}, marking as complete.`);
  }
}

/**
 * Creates a standardized embed that can be modified after the fact to fit the usecase.
 * 
 * @param airing The aired episode to model the embed around
 * @param titleFormat The title format to use for the default description
 * @returns A filled out, but modifiable embed
 */
export function createAnnouncementEmbed(airing: AiringSchedule, titleFormat: TitleFormat): MessageEmbed {
  const embed = new MessageEmbed()
    .setAuthor({
      name: "AniList",
      iconURL: "https://anilist.co/img/logo_al.png",
      url: "https://anilist.co/"
    })
    .setColor(airing.media.coverImage.color || 43775)
    .setDescription(`Episode ${airing.episode} of [${getTitle(airing.media.title, titleFormat)}](${airing.media.siteUrl}) has just aired.${airing.media.episodes === airing.episode ? " This is the season finale." : ""}`)
    .setTimestamp(airing.airingAt * 1000)
    .setFooter({
      text: [ 
        airing.media.episodes ? `${airing.media.episodes} Episodes` : "", 
        `Format: ${readableFormat(airing.media.format)}`,
      ].filter(s => s.length > 0).join(" • "),
    })
    .setThumbnail(airing.media.coverImage.large)

  const allowedExternalLinks = airing.media.externalLinks.filter(l => {
    const streamingsite = STREAMING_SITES.find(s => s.name === l.site);
    return streamingsite && (!streamingsite.filter || streamingsite.filter(l));
  });
  if (allowedExternalLinks.length > 0) {
    embed.addFields({ name: "Streams", value: allowedExternalLinks.map(l => {
      const streamSite = STREAMING_SITES.find(s => s.name === l.site);
      return `${streamSite.icon ? streamSite.icon : ""} [${l.site}](${l.url})`
    }).join(" | ")});
    embed.addFields({ name: "Notice", value: "It may take some time for this episode to appear on the above streaming service(s)." });
  } else
    embed.addFields({ name: "Streams", value: "No licensed streaming links available" });

  return embed;
}