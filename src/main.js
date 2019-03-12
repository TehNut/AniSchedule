require("dotenv").config();
const requireText = require("require-text");
const discord = require("discord.js");
const client = new discord.Client();
const flatten = require("array-flatten");
const fs = require("fs");
import commands from "./commands";
import {getAnnouncementEmbed, getFromNextDays, query} from "./util";

const commandPrefix = process.env.COMMAND_PREFIX || "!";
const dataFile = "./data.json";
let data = {};

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  if (fs.existsSync(dataFile)) {
    data = JSON.parse(fs.readFileSync(dataFile));
  } else {
    fs.writeFileSync(dataFile, JSON.stringify({}));
  }

  handleSchedules(Math.round(getFromNextDays().getTime() / 1000)); // Initial run
  setInterval(() => handleSchedules(Math.round(getFromNextDays().getTime() / 1000)), 1000 * 60 * 60 * 24); // Schedule future runs every 24 hours
});

client.on('error', console.error);

client.on("message", msg => {
  if (msg.author.bot)
    return;

  const msgContent = msg.content.split(" ");

  if (msgContent[0].startsWith(commandPrefix)) {
    const command = commands[msgContent[0].substr(commandPrefix.length)];
    if (command) {
      const serverData = data[msg.guild.id] || {};
      const promise = command.handle(msg, msgContent.slice(1), serverData);
      if (promise) {
        promise.then(ret => {
          if (ret) {
            data[msg.guild.id] = ret;
            fs.writeFileSync(dataFile, JSON.stringify(data));
          }
        });
      }
    }
  }
});

client.login(process.env.BOT_TOKEN);

function handleSchedules(time, page) {
  query(requireText("./query/Schedule.graphql", require), { page: page, watched: getAllWatched(), nextDay: time }, res => {
    if (res.errors) {
      console.log(JSON.stringify(res.errors));
      return;
    }

    res.data.Page.airingSchedules.forEach(e => {
      const date = new Date(e.airingAt * 1000);
      console.log(`Scheduling announcement for ${e.media.title.romaji} on ${date}`);
      setTimeout(() => makeAnnouncement(e, date), e.timeUntilAiring * 1000);
    });

    // Gather any other pages
    if (res.data.Page.pageInfo.hasNextPage)
      handleSchedules(time, res.data.Page.pageInfo.currentPage + 1);
  });
}

function getAllWatched() {
  const watched = [];
  Object.values(data).forEach(server => {
    Object.values(server).filter(c => c.shows).forEach(c => c.shows.forEach(s => watched.push(s)));
  });
  return [...flatten(watched)];
}

function makeAnnouncement(entry, date, upNext = false) {
  const embed = getAnnouncementEmbed(entry, date, upNext);

  Object.values(data).forEach(serverData => {
    Object.entries(serverData).forEach(([channelId, channelData]) => {
      if (!channelData.shows || channelData.shows.length === 0)
        return;

      if (channelData.shows.includes(entry.media.id)) {
        const channel = client.channels.find(v => v.id === channelId);
        if (channel) {
          console.log(`Announcing episode ${entry.media.title.romaji} to ${channel.guild.name}@${channel.id}`);
          channel.send({embed});
        }
      }
    });
  });
}

export default {
  commandPrefix,
  commands,
  client
}
