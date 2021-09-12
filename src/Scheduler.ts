import { MessageEmbed, Snowflake, TextChannel } from "discord.js";
import { AiringSchedule, ServerConfig, TitleFormat } from "./Model";
import { getTitle, getUniqueMediaIds, query, readableFormat } from "./Util";
import { client } from "./AniSchedule";
import { SCHEDULE_QUERY, SET_ACTIVITY, STREAMING_SITES } from "./Constants";

const announcementTimouts: NodeJS.Timeout[] = []

export async function initScheduler(data: Record<Snowflake, ServerConfig>) {
  // Clear any remaining announcements since we're about to remake them all
  // The only ones that should be left are any made when adding a new show to watch
  announcementTimouts.forEach(clearTimeout);

  // Current time in ms + 24 hours worth of ms
  const endTime = Date.now() + (24 * 60 * 60 * 1000);

  const uniqueIds = getUniqueMediaIds(Object.values(data));

  // Grab all the necessary announcements over the next 24 hours and schedule our own channel announcements
  await scheduleAnnouncements(uniqueIds, Object.values(data), Date.now(), endTime);

  // Re-initialize the scheduler 1 minute before the end of the last tracked time window
  setTimeout(() => initScheduler(data), endTime - Date.now() - (60 * 1000));

  if (SET_ACTIVITY) {
    // Subsequent schedules will update the count
    client.user?.setActivity({ type: "WATCHING", name: `${uniqueIds.length} airing anime` });
  }
}

/**
 * Schedules announcements for the given media IDs so long as they have episodes airing in the given time window.
 * 
 * @param mediaIds The AniList IDs of the media
 * @param serverConfigs An array of all the server configs
 * @param startTime The start of the time window in ms
 * @param endTime The end of the time window in ms
 */
export async function scheduleAnnouncements(mediaIds: number[], serverConfigs: ServerConfig[], startTime: number = Date.now(), endTime: number = Date.now() + (24 * 60 * 60 * 1000)) {
  const upcomingEpisodes = await getUpcomingEpisodes(mediaIds, startTime, endTime);
  upcomingEpisodes.forEach(e => {
    console.log(`Scheduled announcement for ${e.media.title.romaji} at ${new Date(e.airingAt * 1000)}`);
    const timeout = setTimeout(() => sendAnnouncement(serverConfigs, e), e.timeUntilAiring * 1000);
    announcementTimouts.push(timeout);
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
 * @param serverConfigs An array of all the server configs
 * @param airing The airing schedule to announce
 */
export async function sendAnnouncement(serverConfigs: ServerConfig[], airing: AiringSchedule) {
  for (const serverConfig of serverConfigs) {
    let watchConfigs = serverConfig.watching.filter(w => w.anilistId === airing.media.id); 
    for (const watch of watchConfigs) {
      const channel = client.channels.cache.get(watch.channelId) as TextChannel;     
      if (channel) {
        const roleMention = watch.pingRole ? await channel.guild.roles.fetch(watch.pingRole) : null;
        const message = await channel.send({
          content: roleMention ? `<@&${roleMention.id}>` : undefined,
          embeds: [ createAnnouncementEmbed(airing, serverConfig.titleFormat) ],
        });
        console.log(`Sent announcement for ${airing.media.title.romaji} to ${channel.guild.name}#${channel.name}`);
        // If a server loses it's boost level, the thread archive time might be set too high
        try {
          if (watch.createThreads)
            message.startThread({ 
              name: `${getTitle(airing.media.title, serverConfig.titleFormat)} Episode ${airing.episode} Discussion`,
              autoArchiveDuration: watch.threadArchiveTime
            });
        } catch (e) {
          console.log("Failed to create thread", e.message || e);
        }
      }
    }
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
    .setAuthor("AniList", "https://anilist.co/img/logo_al.png", "https://anilist.co/")
    .setColor(airing.media.coverImage.color || 43775)
    .setDescription(`Episode ${airing.episode} of [${getTitle(airing.media.title, titleFormat)}](${airing.media.siteUrl}) has just aired.${airing.media.episodes === airing.episode ? " This is the season finale." : ""}`)
    .setTimestamp(airing.airingAt * 1000)
    .setFooter([ 
      airing.media.episodes ? `${airing.media.episodes} Episodes` : "", 
      `Format: ${readableFormat(airing.media.format)}`,
    ].filter(s => s.length > 0).join(" • "))
    .setThumbnail(airing.media.coverImage.large)

  const allowedExternalLinks = airing.media.externalLinks.filter(l => {
    const streamingsite = STREAMING_SITES.find(s => s.name === l.site);
    return streamingsite && (!streamingsite.filter || streamingsite.filter(l));
  });
  if (allowedExternalLinks.length > 0) {
    embed.addField("Streams", allowedExternalLinks.map(l => {
      const streamSite = STREAMING_SITES.find(s => s.name === l.site);
      return `${streamSite.icon ? streamSite.icon : ""} [${l.site}](${l.url})`
    }).join(" | "));
    embed.addField("Notice", "It may take some time for this episode to appear on the above streaming service(s).");
  } else
    embed.addField("Streams", "No licensed streaming links available");

  return embed;
}