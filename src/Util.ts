import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync, renameSync } from "fs";
import fetch from "node-fetch";
import { logger } from "./AniSchedule";
import { DATA_PATH } from "./Constants";
import { MediaFormat, MediaTitle, ServerConfigLegacy, ThreadArchiveTime, TitleFormat } from "./Model";

export async function query(query: string, variables?: any) {
  return fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      query,
      variables
    })
  }).then(res => res.json());
}

const alIdRegex = /anilist\.co\/anime\/(.\d*)/;
const malIdRegex = /myanimelist\.net\/anime\/(.\d*)/;

export async function getMediaId(input: string): Promise<number | null> {
  // First we try directly parsing the input in case it's the standalone ID
  const output = parseInt(input);
  if (output)
    return output;

  // If that fails, we try parsing it with regex to pull the ID from an AniList link
  let match = alIdRegex.exec(input);
  // If there's a match, parse it and return that
  if (match)
    return parseInt(match[1]);

  // If that fails, we try parsing it with another regex to get an ID from a MAL link
  match = malIdRegex.exec(input);
  // If we can't find a MAL ID in the URL, just return null;
  if (!match)
    return null;

  return await query("query($malId: Int) { Media(idMal: $malId) { id } }", { malId: match[1] }).then(res => {
    if (res.errors) {
      logger.error(JSON.stringify(res.errors));
      return;
    }

    return res.data.Media.id;
  });
}

export function getTitle(title: MediaTitle, wanted: TitleFormat) {
  switch (wanted) {
    case "NATIVE": return title.native;
    case "ROMAJI": return title.romaji;
    case "ENGLISH": return title.english || title.romaji;
    default: return title.romaji;
  }
}

export function readableFormat(format: MediaFormat) {
  switch(format) {
    case "MOVIE": return "Movie";
    case "SPECIAL": return "Special";
    case "TV_SHORT": return "TV Short";
    default: return format;
  }
}

export async function getUniqueMediaIds(prisma: PrismaClient): Promise<number[]> {
  return (await prisma.watchConfig.findMany({
    where: {
      completed: false
    },
    select: {
      anilistId: true,
    },
    distinct: [ "anilistId" ]
  })).map(r => r.anilistId);
}

export function parseTime(seconds: number) {
  let weeks = Math.floor(seconds / (3600 * 24 * 7));
  seconds -= weeks * 3600 * 24 * 7;
  let days = Math.floor(seconds / (3600 * 24));
  seconds -= days * 3600 * 24;
  let hours = Math.floor(seconds / 3600);
  seconds -= hours * 3600;
  let minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;

  return { weeks, days, hours, minutes, seconds };
}

export function formatTime(seconds: number, appendSeconds?: boolean) {
  const time = parseTime(seconds);

  let ret = "";
  if (time.weeks > 0)
    ret += time.weeks + "w";
  if (time.days > 0)
    ret += (ret.length === 0 ? "" : " ") + time.days + "d";
  if (time.hours > 0)
    ret += (ret.length === 0 ? "" : " ") + time.hours + "h";
  if (time.minutes > 0)
    ret += (ret.length === 0 ? "" : " ") + time.minutes + "m";

  if (appendSeconds && time.seconds > 0)
    ret += (ret.length === 0 ? "" : " ") + time.seconds + "s";

  return ret;
}

export async function convertDataJson(prisma: PrismaClient) {
  if (!existsSync(DATA_PATH)) {
    logger.info("Skipping data conversion as the old json format does not exist.")
    return;
  }

  const data = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as Record<string, ServerConfigLegacy>;
  for (const [ serverId, serverConfig ] of Object.entries(data)) {
    await prisma.serverConfig.create({
      data: {
        serverId,
        titleFormat: serverConfig.titleFormat,
        permission: serverConfig.permission,
        permissionRoleId: serverConfig.permissionRoleId
      }
    });
    logger.info(`Converted server config for server ID ${serverId}`)

    for (const watchConfig of serverConfig.watching) {
      try {
        await prisma.watchConfig.create({
          data: {
            anilistId: watchConfig.anilistId,
            channelId: watchConfig.channelId,
            createThreads: watchConfig.createThreads || false,
            pingRole: watchConfig.pingRole,
            threadArchiveTime: watchConfig.threadArchiveTime || ThreadArchiveTime.ONE_DAY
          }
        });
        logger.info(`Converted watch config for AniList ID ${watchConfig.anilistId} in channel ${watchConfig.channelId}`);
      } catch (e) {
        logger.error(`Failed to convert watch config for media ${watchConfig.anilistId} in channel id ${watchConfig.channelId}: ${e.message || e}`);
      }
    }
  }

  renameSync(DATA_PATH, `${DATA_PATH}.old`);

  await checkCompletion(prisma);
}

async function checkCompletion(prisma: PrismaClient, page: number = 1) {
  const ids = (await prisma.watchConfig.findMany({
    where: {
      completed: false
    },
    select: {
      anilistId: true
    },
    distinct: [ "anilistId" ]
  })).map(r => r.anilistId);
  const result = await query("query ($page: Int, $ids: [Int!]) { Page(page: $page) { pageInfo { hasNextPage } media(id_in: $ids) { id status } } }", {
    page,
    ids: ids
  }).then(res => res.data.Page);

  const media: { id: number, status: string }[] = result.media;

  for (const m of media) {
    if (m.status === "FINISHED" || m.status === "CANCELLED") {
      const updated = await prisma.watchConfig.updateMany({
        where: {
          anilistId: m.id
        },
        data: {
          completed: true
        }
      });
      logger.info(`Updated ${updated.count} configs for ID ${m.id}`);
    }
  }

  if (result.pageInfo.hasNextPage)
    await checkCompletion(prisma, page + 1);
}