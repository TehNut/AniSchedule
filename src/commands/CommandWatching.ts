import { TitleFormat } from "../Model";
import { formatTime, getTitle, query } from "../Util";
import { Command, getServerConfig } from "./Command";

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

const command: Command = {
  name: "watching",
  async handleInteraction(client, interaction, prisma) {
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const serverConfig = await getServerConfig(prisma, interaction.guildId);
    const watching = (await prisma.watchConfig.findMany({
      where: {
        channelId: channel.id
      }
    })).map(r => r.anilistId);
    let description = "";
    const otherChannel = channel.id !== interaction.channelId;
    
    let watchingMedia = (await query(watchingQuery, { ids: watching })).data.Page.media as any[];
    watchingMedia = watchingMedia
      .filter(m => m.status !== "FINISHED" && m.status !== "CANCELLED")
      .sort((m1, m2) => m1.nextAiringEpisode?.timeUntilAiring - m2.nextAiringEpisode?.timeUntilAiring);

    for (const m of watchingMedia) {
      const nextLine = `\n• [${getTitle(m.title, serverConfig.titleFormat as TitleFormat)}](${m.siteUrl})${m.nextAiringEpisode ? ` (~${formatTime(m.nextAiringEpisode.timeUntilAiring)})` : ''}`;
      if (1000 - description.length < nextLine.length) {
        if (interaction.replied)
          await interaction.followUp({ embeds: createEmbed(description), ephemeral: otherChannel });
        else
          await interaction.reply({ embeds: createEmbed(description), ephemeral: otherChannel });
        description = "";
      }

      description += nextLine;
    }

    if (description.length > 0) {
      if (interaction.replied)
        await interaction.followUp({ embeds: createEmbed(description), ephemeral: otherChannel });
      else
        await interaction.reply({ embeds: createEmbed(description), ephemeral: otherChannel });
    } else if (!interaction.replied) {
      await interaction.reply({ content: "No currently airing or upcoming shows are being announced.", ephemeral: otherChannel });
    }

    return false;
  },
};

export default command;