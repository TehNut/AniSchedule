import { Client, CommandInteraction, GuildChannel, Snowflake } from "discord.js";
import { ServerConfig } from "../Model";
import { scheduleAnnouncements } from "../Scheduler";
import { query, getMediaId, getTitle } from "../Util";
import Command from "./Command";

export default class CommandWatch extends Command {
  constructor() {
    super({
      name: "watch",
      description: "Adds a new anime to be announced.",
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
            { name: "1 Hour", value: 60 },
            { name: "1 Day", value: 1440 },
            { name: "3 Days", value: 4320 },
            { name: "7 days", value: 10080 },
          ]
        }
      ]
    });
  }

  async handleInteraction(client: Client, interaction: CommandInteraction, data: Record<Snowflake, ServerConfig>) {
    // TODO check permission
    const { value } = interaction.options.get("anime") as { value: string };
    const { channel } = interaction.options.has("channel") ? interaction.options.get("channel") as { channel: GuildChannel } : { channel: interaction.channel };
    const { value: createThreads } = interaction.options.has("create_threads") ? interaction.options.get("create_threads") as { value: boolean } : { value: false };
    const { value: threadArchiveTime } = interaction.options.has("thread_archive") ? interaction.options.get("thread_archive") as { value: number } : { value: 1440 };

    const anilistId = await getMediaId(value as string);
    if (!anilistId) {
      interaction.reply({
        ephemeral: true,
        content: "We couldn't find that anime! Please check your input and try again"
      });
      return false;
    }

    if (channel.type === "voice") {
      interaction.reply({
        ephemeral: true,
        content: "Announcements cannot be made in voice channels."
      });
      return false;
    }

    let serverConfig: ServerConfig = data[interaction.guildID];
    if (!serverConfig) {
      serverConfig = data[interaction.guildID] = {
        permission: "OWNER",
        titleFormat: "ROMAJI",
        watching: []
      } as ServerConfig;
    }

    if (serverConfig.watching.find(w => w.anilistId === anilistId && w.channelId === channel.id)) {
      interaction.reply({
        ephemeral: true,
        content: `That show is already being announced in ${channel.toString()}`
      });
      return false;
    }

    const media = (await query("query($id: Int!) { Media(id: $id) { id status title { native romaji english } } }", { id: anilistId })).data.Media;
    if (![ "NOT_YET_RELEASED", "CURRENT" ].includes(media.status)) {
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
      threadArchiveTime: threadArchiveTime as 60 | 1440 | 4320 | 10080
    });

    await scheduleAnnouncements([ anilistId ], Object.values(data));

    interaction.reply({
      content: `Announcements will now be made for [${getTitle(media.title, serverConfig.titleFormat)}](https://anilist.co/anime/${media.id}) in ${channel.toString()}.`
    });
    return true;
  }
}