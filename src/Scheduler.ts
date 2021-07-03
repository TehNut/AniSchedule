import { MessageEmbed, Snowflake, TextChannel } from "discord.js";
import { AiringSchedule, ServerConfig, TitleFormat } from "./Model";
import { getTitle, query, readableFormat } from "./Util";
import { client } from "./AniSchedule";

const scheduleQuery = `query($page: Int, $amount: Int = 50, $ids: [Int!]!, $nextDay: Int!, $dateStart: Int) {
  Page(page: $page, perPage: $amount) {
    pageInfo {
      hasNextPage
    }
    airingSchedules(notYetAired: true, mediaId_in: $ids, sort: TIME, airingAt_greater: $dateStart, airingAt_lesser: $nextDay) {
      media {
        id
        siteUrl
        format
        duration
        episodes
        title {
          native
          romaji
          english
        }
        coverImage {
          large
          color
        }
        externalLinks {
          site
          url
        }
      }
      episode
      airingAt
      timeUntilAiring
    }
  }
}`;
const streamingSites = [
  "Amazon",
  "AnimeLab",
  "Crunchyroll",
  "Funimation",
  "Hidive",
  "Hulu",
  "Netflix",
  "VRV",
];
const announcementTimouts: NodeJS.Timeout[] = []

export async function initScheduler(data: Record<Snowflake, ServerConfig>) {
  // Clear any remaining announcements since we're about to remake them all
  // The only ones that should be left are any made when adding a new show to watch
  announcementTimouts.forEach(clearTimeout);

  // Find all the unique shows we need to get the schedule for. This reduces network load 
  const uniqueShows = new Set<number>();
  (Object.values(data) as ServerConfig[]).forEach(c => {
    c.watching.map(show => show.anilistId).forEach(id => uniqueShows.add(id));
  });

  // Current time in ms + 24 hours worth of ms
  const endTime = Date.now() + (24 * 60 * 60 * 1000);

  // Grab all the necessary announcements over the next 24 hours and schedule our own channel announcements
  await scheduleAnnouncements(Array.from(uniqueShows), Object.values(data), Date.now(), endTime);

  // Re-initialize the scheduler 1 minute before the end of the last tracked time window
  setTimeout(() => initScheduler(data), endTime - Date.now() - (60 * 1000));
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
export async function getUpcomingEpisodes(mediaIds: number[], startTime: number, endTime: number): Promise<AiringSchedule[]> {
  startTime = Math.floor(startTime / 1000);
  endTime = Math.floor(endTime / 1000);

  const upcomingEpisodes: AiringSchedule[] = [];

  async function fetchSchedule(page: number) {
    const response = (await query(scheduleQuery, { 
      page, 
      ids: mediaIds,
      dateStart: startTime,
      nextDay: endTime
    })).data.Page;
    
    upcomingEpisodes.push(...response.airingSchedules as AiringSchedule[]);

    if (response.pageInfo.hasNextPage)
      await fetchSchedule(page + 1);
  }

  await fetchSchedule(1);
  return upcomingEpisodes;
}

/**
 * Sends an episode announcement to all channels watching the the show
 * 
 * @param serverConfigs An array of all the server configs
 * @param airing The airing schedule to announce
 */
export async function sendAnnouncement(serverConfigs: ServerConfig[], airing: AiringSchedule) {
  serverConfigs.forEach(serverConfig => {
    serverConfig.watching.filter(w => w.anilistId === airing.media.id).forEach(watch => {
      const channel = client.channels.cache.get(watch.channelId) as TextChannel;     
      if (channel) {
        channel.send({
          embeds: [ createAnnouncementEmbed(airing, serverConfig.titleFormat) ]
        });
      }
    });
  });
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

  const allowedExternalLinks = airing.media.externalLinks.filter(l => streamingSites.includes(l.site));
  if (allowedExternalLinks.length > 0) {
    embed.addField("Streams", allowedExternalLinks.map(l => `[${l.site}](${l.url})`).join(" | "));
    embed.addField("Notice", "It may take some time for this episode to appear on the above streaming service(s).");
  } else
    embed.addField("Streams", "No licensed streaming links available");

  return embed;
}