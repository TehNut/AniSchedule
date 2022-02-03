import { PrismaClient } from "@prisma/client";
import { Client, CommandInteraction } from "discord.js";
import { ThreadArchiveTime } from "../Model";
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
          name: "mention_role",
          description: "A role to mention when the announcement is made.",
          type: "ROLE"
        },
        {
          name: "remove_mention",
          description: "Removes a previously set role mention.",
          type: "BOOLEAN"
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

  async handleInteraction(client: Client, interaction: CommandInteraction, prisma: PrismaClient): Promise<boolean> {
    const value = interaction.options.getString("anime");
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const role = interaction.options.getRole("mention_role");
    const removePing = interaction.options.getRole("remove_mention");
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

    const watchConfig = await prisma.watchConfig.findFirst({
      where: {
        anilistId,
        channelId: channel.id
      }
    });

    if (!watchConfig) {
      interaction.reply({
        ephemeral: true,
        content: `We couldn't find an announcement for that anime in ${channel.toString()}.`
      });
      return false;
    }

    if (role)
      watchConfig.pingRole = role.id;

    if (removePing)
      watchConfig.pingRole = null;

    if (createThreads !== null)
      watchConfig.createThreads = createThreads;
    
    if (threadArchiveTime !== null)
      watchConfig.threadArchiveTime = threadArchiveTime;

    await prisma.watchConfig.update({
      where: {
        channelId_anilistId: {
          anilistId: watchConfig.anilistId,
          channelId: watchConfig.channelId
        }
      },
      data: watchConfig
    });
      
    interaction.reply({
      ephemeral: true,
      content: "Announcement config updated!"
    });
    return true;
  }
}