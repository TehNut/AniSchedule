import { query, getFromNextDays, createAnnouncementEmbed } from "../Util";
import Command from "./Command";
import { readFileSync } from "fs";
import { join } from "path";

const scheduleQuery = readFileSync(join(__dirname, "../query/Schedule.graphql"), "utf8");

export default new Command({
  name: "next",
  description: "Displays the next episode to air (in the next 7 days) that the current channel is watching.",
  handler: async (resolve, message, args, serverStore, channelStore, client) => {
    if (channelStore.shows.length === 0) {
      message.addReaction("👎");
      return resolve();
    }

    const response = await query(scheduleQuery, { watched: channelStore.shows, amount: 1, nextDay:  Math.round(getFromNextDays(7).getTime() / 1000)});
    if (response.errors) {
      console.log(response.errors);
      message.addReaction("👎");
      return resolve();
    }

    if (response.data.Page.airingSchedules.length === 0) {
      message.addReaction("👎");
      return resolve();
    }

    const anime = response.data.Page.airingSchedules[0];
    const embed = createAnnouncementEmbed(anime, new Date(anime.airingAt * 1000), true);
    message.channel.createMessage({ embed });
    resolve();
  }
});