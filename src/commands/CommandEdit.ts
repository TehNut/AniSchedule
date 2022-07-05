import { ThreadArchiveTime } from "../Model";
import { getMediaId } from "../Util";
import { Command } from "./Command";

const command: Command = {
  name: "edit",
  async handleInteraction(client, interaction, prisma) {
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
  },
}

export default command;