import { Snowflake } from "discord.js";

export type ServerConfig = {
  permission: "ANY" | "CHANNEL_MANAGE" | "OWNER";
  titleFormat: TitleFormat;
  watching: WatchConfig[];
}

export type WatchConfig = {
  channelId: Snowflake;
  anilistId: number;
  createThreads: boolean;
  threadArchiveTime: 60 | 1440 | 4320 | 10080; // 1 hour, 1 day, 3 days, 7 days
}

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