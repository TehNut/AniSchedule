import { config as dotenv } from "dotenv";
import { join } from "path";
import { plainToClass, classToPlain } from "class-transformer";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { createClient, setupClient } from "./DiscordHandler";
import Storage, { ServerStorage } from "./DataStore";
import { query, getFromNextDays, createAnnouncementEmbed } from "./Util";
import { GuildTextableChannel } from "eris";

dotenv();

const scheduleQuery = readFileSync(join(__dirname, "./query/Schedule.graphql"), "utf8");

const client = createClient();
setupClient(client);
const storage: Storage = getOrCreateStorage();

// Initial run
handleSchedules(Math.round(getFromNextDays().getTime() / 1000), 1); 
// Schedule future runs every 24 hours
setInterval(() => handleSchedules(Math.round(getFromNextDays().getTime() / 1000), 1), 1000 * 60 * 60 * 24); 

client.connect();

function getOrCreateStorage(): Storage {
  let storage: Storage;
  if (existsSync("./data.json")) {
    storage = plainToClass(Storage, JSON.parse(readFileSync("./data.json", "utf8")), {enableCircularCheck: true});
  } else {
    storage = new Storage();
    writeFileSync("./data.json", JSON.stringify(classToPlain(storage)));
  }

  return storage;
}

export function getStorage(): Storage {
  return storage;
}

let queuedMedia: number[] = [];
async function handleSchedules(time: number, page: number) {
  const response = await query(scheduleQuery, { page, watched: getAllWatched(storage.servers), nextDay: time });
  if (response.errors) {
    console.log(response.errors);
    return;
  }

  response.data.Page.airingSchedules.forEach((e: any) => {
    if (queuedMedia.includes(e.id))
      return;

    const date = new Date(e.airingAt * 1000);
    console.log(`Scheduling announcement for ${e.media.title.romaji} on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`);
    queuedMedia.push(e.id);
    setTimeout(() => makeAnnouncement(e, date), e.timeUntilAiring * 1000);
  });

  if (response.data.Page.pageInfo.hasNextPage)
    handleSchedules(time, response.data.Page.pageInfo.currentPage + 1);
}

function makeAnnouncement(entry: any, date: Date, upNext = false) {
  queuedMedia = queuedMedia.filter(q => q !== entry.id);
  const embed = createAnnouncementEmbed(entry, date, upNext);

  storage.servers.forEach(server => {
    server.channels.forEach(c => {
      if (!c.shows.includes(entry.media.id))
        return;
      
      const channel = client.getChannel(c.channelId) as GuildTextableChannel;
      if (channel) {
        console.log(`Announcing episode ${entry.media.title.romaji} to ${channel.guild.name}@${channel.id}`);
        channel.createMessage({ embed });
        if (entry.media.episodes === entry.episode)
          c.shows = c.shows.filter(id => id !== entry.media.id);
      }
    });
  });
}

function getAllWatched(storage: ServerStorage[]): number[] {
  const watched = new Set<number>();
  storage.forEach(server => server.channels.forEach(channel => channel.shows.forEach(s => watched.add(s))));
  return Array.from(watched.values())
}