const requireText = require("require-text");
import {query,getFromNextDays,getAnnouncementEmbed} from "./util";

const alIdRegex = /anilist\.co\/anime\/(.\d*)/;
const malIdRegex = /myanimelist\.net\/anime\/(.\d*)/;

export default {
  watch: {
    async handle(message, args, data) {
      if (!checkModifyPermission(message)) {
        message.react("👎");
        return;
      }

      message.channel.startTyping();
      const channelData = data[message.channel.id] || { shows: [] };
      const watched = channelData.shows || [];
      const watchId = await getMediaId(args[0]);

      if (!watchId || watched.includes(watchId)) {
        message.react("👎");
        message.channel.stopTyping();
        return;
      }
      watched.push(watchId);
      channelData.shows = watched;
      data[message.channel.id] = channelData;
      message.react("👍");
      message.channel.stopTyping();
      return data;
    }
  },
  unwatch: {
    async handle(message, args, data) {
      if (!checkModifyPermission(message)) {
        message.react("👎");
        return;
      }

      message.channel.startTyping();
      const channelData = data[message.channel.id];
      if (!channelData || !channelData.shows || channelData.shows.length === 0) {
        message.react("🤷");
        message.channel.stopTyping();
        return;
      }

      let watchId = await getMediaId(args[0]);
      if (!watchId || !channelData.shows.includes(watchId)) {
        message.react("👎");
        message.channel.stopTyping();
        return;
      }
      channelData.shows = channelData.shows.filter(id => id !== watchId);
      data[message.channel.id] = channelData;
      message.react("👍");
      message.channel.stopTyping();
      return data;
    }
  },
  next: {
    handle(message, args, data) {
      const channelData = data[message.channel.id];
      if (!channelData || !channelData.shows || channelData.shows.length === 0) {
        message.react("👎");
        return;
      }

      message.channel.startTyping();
      query(requireText("./query/Schedule.graphql", require), { page: 0, watched: channelData.shows, nextDay: Math.round(getFromNextDays(7).getTime() / 1000) }, res => {
        if (res.errors) {
          console.log(JSON.stringify(res.errors));
          message.channel.stopTyping();
          return;
        }

        if (res.data.Page.airingSchedules.length === 0) {
          message.react("👎");
          message.channel.stopTyping();
          return;
        }

        const anime = res.data.Page.airingSchedules[0];
        const embed = getAnnouncementEmbed(anime, new Date(anime.airingAt * 1000), true);
        message.channel.send({embed});
        message.channel.stopTyping();
      });
    }
  },
  watching: {
    handle(message, args, data) {
      const channelData = data[message.channel.id];
      if (!channelData || !channelData.shows || channelData.shows.length === 0) {
        message.react("👎");
        return;
      }

      message.channel.startTyping();
      handleWatchingPage(0);

      function handleWatchingPage(page) {
        query(requireText("./query/Watching.graphql", require), { watched: channelData.shows, page }, res => {
          let description = "";
          res.data.Page.media.forEach(m => {
            if (m.status !== "RELEASING")
              return;

            let nextLine = `\n- [${m.title.romaji}](${m.siteUrl}) (\`${m.id}\`)`;
            if (1000 - description.length < nextLine.length) {
              sendWatchingList(description, message.channel);
              console.log(description.length);
              description = "";
            }

            description += nextLine;
          });
          if (description.length !== 0)
            sendWatchingList(description, message.channel);

          if (res.data.Page.pageInfo.hasNextPage) {
            handleWatchingPage(res.data.Page.pageInfo.currentPage + 1);
            return;
          }
          if (description.length === 0)
            message.channel.send("No currently airing shows are being announced.");
          message.channel.stopTyping();
        });
      }
    }
  },
};

function sendWatchingList(description, channel) {
  let embed = {
    title: "Current announcements ",
    author: {
      name: "AniList",
      url: "https://anilist.co",
      icon_url: "https://anilist.co/img/logo_al.png"
    },
    description
  };
  channel.send({embed});
}

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

async function getMediaId(input) {
  // First we try directly parsing the input in case it's the standalone ID
  let output = parseInt(input);
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

  return await query("query($malId: Int){Media(idMal:$malId){id}}", {malId: match[1]}, res => {
    if (res.errors) {
      console.log(JSON.stringify(res.errors));
      return;
    }

    return res.data.Media.id;
  });
}
