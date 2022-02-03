import { Snowflake } from "discord.js";

export enum ThreadArchiveTime {
  ONE_HOUR = 60,
  ONE_DAY = 1440,
  THREE_DAYS = 4320,
  SEVEN_DAYS = 10080
}

// TODO Remove later. Only used for data.json conversion
export type ServerConfigLegacy = {
  permission: PermissionType;
  permissionRoleId: Snowflake;
  titleFormat: TitleFormat;
  watching: Array<{
    channelId: Snowflake;
    anilistId: number;
    pingRole?: Snowflake;
    createThreads: boolean;
    threadArchiveTime: ThreadArchiveTime;
  }>;
}

export type PermissionType = "ANY" | "ROLE" | "OWNER";

export type TitleFormat = "NATIVE" | "ROMAJI" | "ENGLISH";

export type Media = {
  id: number;
  siteUrl: `https://anilist.co/anime/${number}`;
  title: MediaTitle;
  duration: number;
  episodes?: number;
  format: MediaFormat;
  coverImage: {
    large: string;
    color: `#${string}`;
  };
  externalLinks: {
    site: string;
    url: string;
  }[];
}

export type MediaFormat = "TV" | "TV_SHORT" | "MOVIE" | "SPECIAL" | "OVA" | "ONA";

export type MediaTitle = {
  native: string;
  romaji: string;
  english?: string;
}

export type AiringSchedule = {
  id: number;
  media: Media;
  episode: number;
  airingAt: number;
  timeUntilAiring: number;
}

export type StreamSite = {
  name: string;
  icon: string;
  filter?: (externalLink: { site: string, url: string }) => boolean
}