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
let data = {};

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  if (fs.existsSync("./data.json")) {
    data = JSON.parse(fs.readFileSync("./data.json"));
  } else {
    fs.writeFileSync("./data.json", JSON.stringify({}));
  }

  handleSchedules(Math.round(getTomorrow().getTime() / 1000)); // Initial run
  setInterval(() => handleSchedules(Math.round(getTomorrow().getTime() / 1000)), 1000 * 60 * 60 * 24); // Schedule future runs every 24 hours
});

client.on("error", e => {
  console.log(e);
});

client.on("message", msg => {
  if (msg.author.bot)
    return;

  let msgContent = msg.content.split(" ");

  if (msgContent[0].startsWith(commandPrefix)) {
    let command = msgContent[0].substr(commandPrefix.length);
    command = commands[command];
    if (command) {
      let serverData = data[msg.guild.id] || {};
      let ret = command.handle(msg, msgContent.slice(1), serverData);
      if (ret) {
        data[msg.guild.id] = ret;
        fs.writeFileSync("./data.json", JSON.stringify(data));
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
      let date = new Date(e.airingAt * 1000);
      console.log(`Scheduling announcement for ${e.media.title.romaji} at ${date}`);
      // setTimeout(() => {
        let description = `Episode ${e.episode} of [${e.media.title.romaji}](${e.media.siteUrl}) has just aired.`;
        if (e.media.externalLinks) {
          description += "\n\nWatch: ";
          let multipleSites = false;
          e.media.externalLinks.forEach(site => {
            if (streamingSites.includes(site.site)) {
              description += `${multipleSites ? " | " : ""} [${site.site}](${site.url})`;
              multipleSites = true;
            }
          });
        }

        let embed = {
          color: parseInt(e.media.coverImage.color.substr(1), 16),
          thumbnail: {
            url: e.media.coverImage.large
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
          if (serverData.watched.includes(e.media.id)) {
            let channel = client.channels.find(v => v.id === serverData.channel);
            if (channel) {
              console.log(`Announcing episode ${e.media.title.romaji} to ${serverData.channel}`);
              channel.send({embed});
            }
          }
        });
      // }, e.timeUntilAiring * 1000);
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
      query: query,
      variables: variables
    })
  }).then(res => res.json()).then(res => callback(res));
}

function getTomorrow() {
  return new Date(new Date().getTime() + (24 * 60 * 60 * 1000));
}

function getAllWatched() {
  let watched = [];
  Object.values(data).forEach(e => {
    watched.push(e.watched);
  });
  return [...flatten(watched)];
}

const commands = {
  channel: {
    handle(message, args, data) {
      if (message.guild.owner.id !== message.author.id) {
        message.react("👎");
        return;
      }
      data.channel = message.channel.id;
      message.react("👍");
      return data;
    }
  },
  watch: {
    handle(message, args, data) {
      let watched = data.watched || [];
      let watchId = parseInt(args[0]);
      if (!watchId || watched.includes(watchId)) {
        message.react("👎");
        return;
      }
      watched.push(watchId);
      data.watched = watched;
      message.react("👍");
      return data;
    }
  },
  unwatch: {
    handle(message, args, data) {
      let watched = data.watched || [];
      let watchId = parseInt(args[0]);
      if (!watchId || !watched.includes(watchId)) {
        message.react("👎");
        return;
      }
      watched = watched.filter(id => id !== watchId);
      data.watched = watched;
      message.react("👍");
      return data;
    }
  },
  watching: {
    handle(message, args, data) {
      query(requireText("./query/Watching.graphql", require), { watched: data.watched }, res => {
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
