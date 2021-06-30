import { Snowflake } from "discord.js";

export type ServerConfig = {
  permission: "ANY" | "CHANNEL_MANAGE" | "OWNER";
  titleFormat: "NATIVE" | "ROMAJI" | "ENGLISH";
  watching: WatchConfig[];
}

export type WatchConfig = {
  channelId: Snowflake;
  anilistId: number;
  createThreads: boolean;
  threadArchiveTime: 60 | 1440 | 4320 | 10080; // 1 hour, 1 day, 3 days, 7 days
}