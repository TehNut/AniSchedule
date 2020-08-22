import { query, formatTime } from "../Util";
import Command from "./Command";
import { readFileSync } from "fs";
import { join } from "path";
import { TextableChannel } from "eris";

const watchingQuery = readFileSync(join(__dirname, "../query/Watching.graphql"), "utf8");

export default new Command({
  name: "watching",
  description: "Lists all the anime that are being watched by this channel.",
  handler: async (resolve, message, args, serverStore, channelStore, client) => {
    if (channelStore.shows.length === 0) {
      message.addReaction("👎");
      return resolve();
    }

    async function handleWatchingPage(page: number) {
      const response = await query(watchingQuery, { watched: channelStore.shows, page });
      let description = "";
      response.data.Page.media.forEach((m: any) => {
        const nextLine = `\n• [${m.title.romaji}](${m.siteUrl}) (~${formatTime(m.nextAiringEpisode.timeUntilAiring)})`;
        if (1000 - description.length < nextLine.length) {
          sendWatchingList(description, message.channel);
          description = "";
        }

        description += nextLine;
      });

      if (description.length !== 0)
        sendWatchingList(description, message.channel);

      if (response.data.Page.pageInfo.hasNextPage) {
        handleWatchingPage(response.data.Page.pageInfo.currentPage + 1);
        return;
      }

      if (description.length === 0)
        message.channel.createMessage("No currently airing shows are being announced.");
    }

    handleWatchingPage(1);
    resolve();
  }
});

function sendWatchingList(description: string, channel: TextableChannel) {
  const embed = {
    title: "Current announcements",
    color: 4044018,
    author: {
      name: "AniList",
      url: "https://anilist.co",
      icon_url: "https://anilist.co/img/logo_al.png"
    },
    description
  };
  channel.createMessage({embed});
}