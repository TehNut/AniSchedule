import { getFromNextDays, query, createAnnouncementEmbed } from "../Util";
import Command from "./Command";
import { readFileSync } from "fs";
import { join } from "path";

const scheduleQuery = readFileSync(join(__dirname, "../query/Schedule.graphql"), "utf8");

export default new Command({
  name: "nextday",
  description: "List the upcoming episodes for the next 24 hours. You can provide a number of days (periods of 24 hours) to check. So `2` would be between 24 hours from now and 48 hours from now.",
  checksPermission: true,
  handler: async (resolve, message, args, serverStore, channelStore, client) => {
    const skip = Math.max(parseInt(args[0]) || 1, 1);

    const dateGreater = Math.round(getFromNextDays(skip - 1).getTime() / 1000);
    const dateLesser = Math.round(getFromNextDays(skip).getTime() / 1000);

    const watched = new Set<number>();
    serverStore.channels.forEach(channel => channel.shows.forEach(s => watched.add(s)));
    const allWatching = Array.from(watched.values())

    async function handlePage(page: number) {
      const response = await query(scheduleQuery, { page, watched: allWatching, dateStart: dateGreater, nextDay: dateLesser });
      if (response.errors) {
        console.log(response.errors)
        message.addReaction("👎");
        return;
      }

      response.data.Page.airingSchedules.forEach((e: any) => {
        const embed = createAnnouncementEmbed(e, new Date(e.airingAt * 1000), true);
        message.channel.createMessage({ embed });
      });

      if (response.data.Page.pageInfo.hasNextPage)
        await handlePage(page + 1);
    }

    handlePage(1);
  }
});