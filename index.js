require("dotenv").config();
const requireText = require("require-text");
const discord = require("discord.js");
const client = new discord.Client();
const fetch = require("node-fetch");
const flatten = require("array-flatten");
const fs = require("fs");

const streamingSites = [
  "Amazon",
  "Animelab",
  "Crunchyroll",
  "Funimation",
  "Hidive",
  "Hulu",
  "Netflix",
  "Viz"
];
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

  handleSchedules(Math.round(getTomorrow().getTime() / 1000)); // Initial run
  setInterval(() => handleSchedules(Math.round(getTomorrow().getTime() / 1000)), 1000 * 60 * 60 * 24); // Schedule future runs every 24 hours
});
client.on("error", e => console.log(e));
client.on("message", msg => {
  if (msg.author.bot)
    return;

  const msgContent = msg.content.split(" ");

  if (msgContent[0].startsWith(commandPrefix)) {
    let command = msgContent[0].substr(commandPrefix.length);
    command = commands[command];
    if (command) {
      const serverData = data[msg.guild.id] || {};
      const ret = command.handle(msg, msgContent.slice(1), serverData);
      if (ret) {
        data[msg.guild.id] = ret;
        fs.writeFileSync(dataFile, JSON.stringify(data));
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

function query(query, variables, callback) {
  fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      query,
      variables
    })
  }).then(res => res.json()).then(res => callback(res));
}

function getTomorrow() {
  return new Date(new Date().getTime() + (24 * 60 * 60 * 1000));
}

function getAllWatched() {
  const watched = [];
  Object.values(data).forEach(server => {
    Object.values(server).filter(c => c.shows).forEach(c => c.shows.forEach(s => watched.push(s)));
  });
  return [...flatten(watched)];
}

function makeAnnouncement(entry, date) {
  let description = `Episode ${entry.episode} of [${entry.media.title.romaji}](${entry.media.siteUrl}) has just aired.`;
  if (entry.media.externalLinks) {
    description += "\n\nWatch: ";
    let multipleSites = false;
    entry.media.externalLinks.forEach(site => {
      if (streamingSites.includes(site.site)) {
        description += `${multipleSites ? " | " : ""} [${site.site}](${site.url})`;
        multipleSites = true;
      }
    });
  }

  let embed = {
    color: parseInt(entry.media.coverImage.color.substr(1), 16),
    thumbnail: {
      url: entry.media.coverImage.large
    },
    author: {
      name: "AniList",
      url: "https://anilist.co",
      icon_url: "https://anilist.co/img/logo_al.png"
    },
    description,
    timestamp: date
  };

  Object.values(data).forEach(serverData => {
    Object.entries(serverData).forEach(([channelId, channelData]) => {
      if (!channelData.shows || channelData.shows.length === 0)
        return;

      if (channelData.shows.includes(e.media.id)) {
        const channel = client.channels.find(v => v.id === channelId);
        if (channel) {
          console.log(`Announcing episode ${e.media.title.romaji} to ${channel.guild.name}@${channel.id}`);
          channel.send({embed});
        }
      }
    });
  });
}

const commands = {
  watch: {
    handle(message, args, data) {
      if (!checkModifyPermission(message)) {
        message.react("👎");
        return;
      }

      const channelData = data[message.channel.id] || { shows: [] };
      const watched = channelData.shows || [];
      const watchId = parseInt(args[0]);
      if (!watchId || watched.includes(watchId)) {
        message.react("👎");
        return;
      }
      watched.push(watchId);
      channelData.shows = watched;
      data[message.channel.id] = channelData;
      message.react("👍");
      return data;
    }
  },
  unwatch: {
    handle(message, args, data) {
      if (!checkModifyPermission(message)) {
        message.react("👎");
        return;
      }

      const channelData = data[message.channel.id];
      if (!channelData || !channelData.shows || channelData.shows.length === 0) {
        message.react("🤷");
        return;
      }

      const watchId = parseInt(args[0]);
      if (!watchId || !channelData.shows.includes(watchId)) {
        message.react("👎");
        return;
      }
      channelData.shows = channelData.shows.filter(id => id !== watchId);
      data[message.channel.id] = channelData;
      message.react("👍");
      return data;
    }
  },
  watching: {
    handle(message, args, data) {
      const channelData = data[message.channel.id];
      if (!channelData || !channelData.shows || channelData.shows.length === 0) {
        message.react("👎");
        return;
      }

      query(requireText("./query/Watching.graphql", require), { watched: channelData.shows}, res => {
        let string = "";
        res.data.Page.media.forEach(m => {
          if (m.status !== "RELEASING")
            return;

          string += (string.length !== 0 ? ", " : "") + `\`${m.title.romaji}\``;
        });
        message.channel.send(string.length === 0 ? "Not watching any currently airing series." : string);
      });
    }
  },
};

function checkModifyPermission(message) {
  switch (process.env.PERMISSION_TYPE) {
    case "CHANNEL_MANAGER":
      return message.channel.permissionsFor(message.author).has("MANAGE_CHANNELS");
    case "SERVER_OWNER":
      return message.author.id === message.guild.ownerID;
    default:
      return true;
  }
}
