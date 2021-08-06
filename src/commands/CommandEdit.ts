import { Client, CommandInteraction, GuildChannel, Snowflake } from "discord.js";
import { ServerConfig, ThreadArchiveTime } from "../Model";
import { getMediaId } from "../Util";
import Command from "./Command";

export default class CommandEdit extends Command {

  constructor() {
    super({
      name: "edit",
      description: "Updates an existing announcement configuration.",
      defaultPermission: false,
      options: [
        {
          name: "anime",
          description: "This can be an AniList ID, AniList URL, or MyAnimeListURL",
          type: "STRING",
          required: true
        },
        {
          name: "channel",
          description: "The channel the announcement is being made in. Defaults to current channel",
          type: "CHANNEL"
        },
        {
          name: "create_threads",
          description: "Should discussion threads be created for each episode. Defaults to false.",
          type: "BOOLEAN"
        },
        {
          name: "thread_archive",
          description: "How long after the last message before the thread is archived. [1 day]",
          type: "INTEGER",
          choices: [
            { name: "1 Hour", value: ThreadArchiveTime.ONE_HOUR },
            { name: "1 Day", value: ThreadArchiveTime.ONE_DAY },
            { name: "3 Days", value: ThreadArchiveTime.THREE_DAYS },
            { name: "7 days", value: ThreadArchiveTime.SEVEN_DAYS },
          ]
        }
      ]
    });
  }

  async handleInteraction(client: Client, interaction: CommandInteraction, data: Record<Snowflake, ServerConfig>): Promise<boolean> {
    // TODO check permission
    const { value } = interaction.options.get("anime") as { value: string };
    const { channel } = interaction.options.has("channel") ? interaction.options.get("channel") as { channel: GuildChannel } : { channel: interaction.channel };
    const { value: createThreads } = interaction.options.has("create_threads") ? interaction.options.get("create_threads") as { value: boolean } : { value: null };
    const { value: threadArchiveTime } = interaction.options.has("thread_archive") ? interaction.options.get("thread_archive") as { value: ThreadArchiveTime } : { value: ThreadArchiveTime.ONE_DAY };

    switch(threadArchiveTime) {
      case ThreadArchiveTime.THREE_DAYS: {
        if (!interaction.guild.features.includes("THREE_DAY_THREAD_ARCHIVE")) {
          interaction.reply({
            ephemeral: true,
            content: "This server does not have the ability to create threads with 3 day archival times."
          })
          return false;
        }
      }
      case ThreadArchiveTime.SEVEN_DAYS: {
        if (!interaction.guild.features.includes("SEVEN_DAY_THREAD_ARCHIVE")) {
          interaction.reply({
            ephemeral: true,
            content: "This server does not have the ability to create threads with 7 day archival times."
          })
          return false;
        }
      }
    }
    const anilistId = await getMediaId(value as string);
    if (!anilistId) {
      interaction.reply({
        ephemeral: true,
        content: "We couldn't find that anime! Please check your input and try again"
      });
      return false;
    }

    if (channel.type === "GUILD_VOICE") {
      interaction.reply({
        ephemeral: true,
        content: "Announcements cannot be made in voice channels."
      });
      return false;
    }

    const serverConfig = this.getServerConfig(data, interaction.guildId);
    const watchConfig = serverConfig.watching.find(w => w.anilistId === anilistId && w.channelId === channel.id);
    if (!watchConfig) {
      interaction.reply({
        ephemeral: true,
        content: `We couldn't find an announcement for that anime in ${channel.toString()}.`
      });
      return false;
    }

    if (createThreads !== null)
      watchConfig.createThreads = createThreads;
    
    if (threadArchiveTime !== null)
      watchConfig.threadArchiveTime = threadArchiveTime;
      
    interaction.reply({
      ephemeral: true,
      content: "Announcement config updated!"
    });
    return true;
  }
}