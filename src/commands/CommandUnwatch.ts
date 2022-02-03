import { PrismaClient } from "@prisma/client";
import { Client, CommandInteraction } from "discord.js";
import { TitleFormat } from "../Model";
import { query, getMediaId, getTitle } from "../Util";
import Command from "./Command";

export default class CommandWatch extends Command {
  constructor() {
    super({
      name: "unwatch",
      description: "Removes an anime announcement.",
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
          description: "The channel to remove the announcements from. Defaults to current channel",
          type: "CHANNEL"
        }
      ]
    });
  }

  async handleInteraction(client: Client, interaction: CommandInteraction, prisma: PrismaClient) {
    const value = interaction.options.getString("anime");
    const channel = interaction.options.getChannel("channel") || interaction.channel;
   
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

    const serverConfig = await this.getServerConfig(prisma, interaction.guildId);
    await prisma.watchConfig.delete({
      where: {
        channelId_anilistId: {
          anilistId,
          channelId: channel.id
        }
      }
    });

    const media = (await query("query($id: Int!) { Media(id: $id) { id title { romaji } } }", { id: anilistId })).data.Media;
    interaction.reply({
      content: `Announcements will no longer be made for [${getTitle(media.title, serverConfig.titleFormat as TitleFormat)}](https://anilist.co/anime/${media.id}) in ${channel.toString()}.`
    });
    return true;
  }
}