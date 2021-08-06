import { Client, CommandInteraction, GuildChannel, Snowflake } from "discord.js";
import { ServerConfig } from "../Model";
import { formatTime, getTitle, query } from "../Util";
import Command from "./Command";

const watchingQuery = `query($ids: [Int]!, $page: Int) {
  Page(page: $page) {
    pageInfo {
      hasNextPage
    }
    media(id_in: $ids) {
      siteUrl
      status
      title {
        native
        romaji
        english
      }
      nextAiringEpisode {
        timeUntilAiring
      }
    }
  }
}`.trim();

export default class CommandWatching extends Command {
  constructor() {
    super({
      name: "watching",
      description: "Lists the anime announcements for a channel",
      options: [
        {
          name: "channel",
          description: "The channel to check announcements for. Defaults to current channel",
          type: "CHANNEL"
        }
      ]
    })
  }

  async handleInteraction(client: Client, interaction: CommandInteraction, data: Record<Snowflake, ServerConfig>): Promise<boolean> {
    const { channel } = interaction.options.has("channel") ? interaction.options.get("channel") as { channel: GuildChannel } : { channel: interaction.channel };
    const serverConfig = this.getServerConfig(data, interaction.guildId);
    const watching = serverConfig?.watching.filter(w => w.channelId === channel.id).map(w => w.anilistId);
    const watchingMedia = (await query(watchingQuery, { ids: watching })).data.Page.media as any[];
    let description = "";
    const otherChannel = channel.id !== interaction.channelId;
    watchingMedia.filter(m => m.status !== "FINISHED" && m.status !== "CANCELLED").forEach(m => {
      const nextLine = `\n• [${getTitle(m.title, serverConfig.titleFormat)}](${m.siteUrl})${m.nextAiringEpisode ? ` (~${formatTime(m.nextAiringEpisode.timeUntilAiring)})` : ''}`;
      if (1000 - description.length < nextLine.length) {
        if (interaction.replied)
          interaction.followUp({ embeds: createEmbed(description), ephemeral: otherChannel });
        else
          interaction.reply({ embeds: createEmbed(description), ephemeral: otherChannel });
        description = "";
      }

      description += nextLine;
    });

    if (description.length > 0) {
      if (interaction.replied)
        interaction.followUp({ embeds: createEmbed(description), ephemeral: otherChannel });
      else
        interaction.reply({ embeds: createEmbed(description), ephemeral: otherChannel });
    } else if (!interaction.replied) {
      interaction.reply({ content: "No currently airing or upcoming shows are being announced.", ephemeral: otherChannel });
    }

    return false;
  }
}

function createEmbed(description: string) {
  return [{
    title: "Current Announcements",
    color: 4044018,
    author: {
      name: "AniList",
      url: "https://anilist.co",
      icon_url: "https://anilist.co/img/logo_al.png"
    },
    description
  }];
}