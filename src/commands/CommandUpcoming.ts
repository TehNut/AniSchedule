import { Client, CommandInteraction, MessageActionRow, MessageSelectMenu, MessageComponentInteraction, Snowflake } from "discord.js";
import { AiringSchedule, ServerConfig } from "../Model";
import { createAnnouncementEmbed, getUpcomingEpisodes } from "../Scheduler";
import { formatTime, getTitle, query } from "../Util";
import Command from "./Command";

const singleEpisodeQuery = `query ($airingId: Int) {
  AiringSchedule(id: $airingId) {
    media {
      id
      siteUrl
      format
      duration
      episodes
      title {
        native
        romaji
        english
      }
      coverImage {
        large
        color
      }
      externalLinks {
        site
        url
      }
    }
    episode
    airingAt
    timeUntilAiring
  }
}`;

export default class CommandUpcoming extends Command {

  constructor() {
    super({
      name: "upcoming",
      description: "Lists upcoming episodes",
      options: [
        {
          name: "days",
          description: "How many days ahead you'd like to see. Defaults to 1 day. Max 7 days.",
          type: "INTEGER",          
        }
      ]
    });
  }

  async handleInteraction(client: Client, interaction: CommandInteraction, data: Record<Snowflake, ServerConfig>): Promise<boolean> {
    const serverConfig = data[interaction.guildID] as ServerConfig;
    const startTime = Date.now();
    let days = interaction.options.has("days") ? interaction.options.get("days").value as number : 1;
    if (days > 7)
      days = 7;

    const endTime = startTime + (days * 24 * 60 * 60 * 1000);
    const upcoming = await getUpcomingEpisodes(serverConfig.watching.filter(w => w.channelId === interaction.channelID).map(w => w.anilistId), startTime, endTime);
    if (upcoming.length === 0) {
      interaction.reply({
        content: `Nothing upcoming in the next ${days} day(s)`,
        ephemeral: true
      });
      return false;
    }
  
    const actionRow = new MessageActionRow();

    if (upcoming.length > 1) {
      const selector = new MessageSelectMenu()
        .setCustomID("upcoming:episode-selector")
        .setPlaceholder("Check another upcoming episode");
      upcoming.forEach(a => {
        let title = getTitle(a.media.title, serverConfig.titleFormat);
        if (title.length > 25)
          title = title.substring(0, 22) + "...";

        selector.addOptions([
          {
            label: title,
            value: a.id.toString(),
            description: `Episode ${a.episode} - ${formatTime(a.timeUntilAiring)}`
          }
        ]);
      });

      actionRow.addComponents([ selector ]);
    }

    const embed = createAnnouncementEmbed(upcoming[0], serverConfig.titleFormat);
    embed.setDescription(`Episode ${upcoming[0].episode} of [${getTitle(upcoming[0].media.title, serverConfig.titleFormat)}](${upcoming[0].media.siteUrl}) will air in ${formatTime(upcoming[0].timeUntilAiring)}.`);

    interaction.reply({
      embeds: [ embed ],
      components: actionRow.components.length > 0 ? [ actionRow ] : undefined,
      ephemeral: true
    });
    return false;
  }

  async handleMessageComponents(client: Client, componentInteraction: MessageComponentInteraction, data: Record<Snowflake, ServerConfig>): Promise<boolean> {
    const serverConfig = data[componentInteraction.guildID] as ServerConfig;
    if (componentInteraction.isSelectMenu() && componentInteraction.customID === "episode-selector") {
      const airingId = parseInt(componentInteraction.values[0]);
      const episode: AiringSchedule = (await query(singleEpisodeQuery, { airingId })).data.AiringSchedule;
      const embed = createAnnouncementEmbed(episode, serverConfig.titleFormat);
      embed.setDescription(`Episode ${episode.episode} of [${getTitle(episode.media.title, serverConfig.titleFormat)}](${episode.media.siteUrl}) will air in ${formatTime(episode.timeUntilAiring)}.`);
      componentInteraction.update({
        embeds: [ embed ]
      })
    }
    return false;
  }
}