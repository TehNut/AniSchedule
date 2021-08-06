import { Client, CommandInteraction, GuildChannel, Snowflake } from "discord.js";
import { ServerConfig } from "../Model";
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

  async handleInteraction(client: Client, interaction: CommandInteraction, data: Record<Snowflake, ServerConfig>) {
    // TODO check permission
    const { value } = interaction.options.get("anime") as { value: string };
    const { channel } = interaction.options.has("channel") ? interaction.options.get("channel") as { channel: GuildChannel } : { channel: interaction.channel };
   
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
        content: `That anime isn't being watched in ${channel.toString()}.`
      });
      return false;
    }

    serverConfig.watching = serverConfig.watching.filter(w => w.anilistId !== anilistId || w.channelId !== channel.id);

    const media = (await query("query($id: Int!) { Media(id: $id) { id title { romaji } } }", { id: anilistId })).data.Media;
    interaction.reply({
      content: `Announcements will no longer be made for [${getTitle(media.title, serverConfig.titleFormat)}](https://anilist.co/anime/${media.id}) in ${channel.toString()}.`
    });
    return true;
  }
}