import { Client, CommandInteraction, GuildChannel, Snowflake } from "discord.js";
import { ServerConfig, ThreadArchiveTime } from "../Model";
import { scheduleAnnouncements } from "../Scheduler";
import { query, getMediaId, getTitle } from "../Util";
import Command from "./Command";

export default class CommandWatch extends Command {
  constructor() {
    super({
      name: "watch",
      description: "Adds a new anime to be announced.",
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
          description: "The channel to make the announcements in. Defaults to current channel",
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

  async handleInteraction(client: Client, interaction: CommandInteraction, data: Record<Snowflake, ServerConfig>) {
    const value = interaction.options.getString("anime");
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const createThreads = interaction.options.getBoolean("create_threads");
    const threadArchiveTime: ThreadArchiveTime = interaction.options.getInteger("thread_archive");
    
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
    if (serverConfig.watching.find(w => w.anilistId === anilistId && w.channelId === channel.id)) {
      interaction.reply({
        ephemeral: true,
        content: `That show is already being announced in ${channel.toString()}`
      });
      return false;
    }

    const media = (await query("query($id: Int!) { Media(id: $id) { id status title { native romaji english } } }", { id: anilistId })).data.Media;
    if (![ "NOT_YET_RELEASED", "RELEASING" ].includes(media.status)) {
      interaction.reply({
        ephemeral: true,
        content: `${getTitle(media.title, serverConfig.titleFormat)} is not an upcoming or currently airing anime.`
      });
      return false;
    }

    serverConfig.watching.push({
      anilistId,
      channelId: channel.id,
      createThreads,
      threadArchiveTime
    });

    await scheduleAnnouncements([ anilistId ], Object.values(data));

    interaction.reply({
      content: `Announcements will now be made for [${getTitle(media.title, serverConfig.titleFormat)}](https://anilist.co/anime/${media.id}) in ${channel.toString()}.`
    });
    return true;
  }
}