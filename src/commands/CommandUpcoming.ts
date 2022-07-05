import { MessageActionRow, MessageSelectMenu } from "discord.js";
import { AiringSchedule, TitleFormat } from "../Model";
import { createAnnouncementEmbed, getUpcomingEpisodes } from "../Scheduler";
import { formatTime, getTitle, query } from "../Util";
import { Command, getServerConfig } from "./Command";

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

const command: Command = {
  name: "upcoming",
  async handleInteraction(client, interaction, prisma) {
    const serverConfig = await getServerConfig(prisma, interaction.guildId);
    const startTime = Date.now();
    let days = interaction.options.getInteger("days") || 1;
    if (days > 7)
      days = 7;

    const endTime = startTime + (days * 24 * 60 * 60 * 1000);
    const channelSeries = (await prisma.watchConfig.findMany({
      where: {
        channelId: interaction.channelId
      }
    })).map(r => r.anilistId);
    const upcoming = await getUpcomingEpisodes(channelSeries, startTime, endTime);
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
        .setCustomId("upcoming:episode-selector")
        .setPlaceholder("Check another upcoming episode");
      upcoming.forEach(a => {
        let title = getTitle(a.media.title, serverConfig.titleFormat as TitleFormat);
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

    try {
      const embed = createAnnouncementEmbed(upcoming[0], serverConfig.titleFormat as TitleFormat);
      embed.setDescription(`Episode ${upcoming[0].episode} of [${getTitle(upcoming[0].media.title, serverConfig.titleFormat as TitleFormat)}](${upcoming[0].media.siteUrl}) will air in ${formatTime(upcoming[0].timeUntilAiring)}.`);

      await interaction.reply({
        embeds: [ embed ],
        components: actionRow.components.length > 0 ? [ actionRow ] : undefined,
        ephemeral: true
      });
    } catch (e) {
      console.log(e)
    }

    return false;
  },
  async handleMessageComponents(client, componentInteraction, prisma) {
    const serverConfig = await this.getServerConfig(prisma, componentInteraction.guildId);
    if (componentInteraction.isSelectMenu() && componentInteraction.customId === "episode-selector") {
      const airingId = parseInt(componentInteraction.values[0]);
      const episode: AiringSchedule = (await query(singleEpisodeQuery, { airingId })).data.AiringSchedule;
      const embed = createAnnouncementEmbed(episode, serverConfig.titleFormat as TitleFormat);
      embed.setDescription(`Episode ${episode.episode} of [${getTitle(episode.media.title, serverConfig.titleFormat as TitleFormat)}](${episode.media.siteUrl}) will air in ${formatTime(episode.timeUntilAiring)}.`);
      componentInteraction.update({
        embeds: [ embed ]
      })
    }
    return false;
  }
};

export default command;