import { Client, CommandInteraction, GuildChannel } from "discord.js";
import { WatchConfig } from "../Model";
import { query } from "../Util";
import Command from "./Command";

export default class CommandWatch extends Command {
  constructor() {
    super({
      name: "watch",
      description: "Adds a new anime to be announced in this channel.",
      options: [
        {
          name: "anime",
          description: "This can be an AniList ID, AniList URL, MyAnimeList ID, or MyAnimeListURL",
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

  async handleInteraction(client: Client, interaction: CommandInteraction) {
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
      return;
    }

    if (channel.type === "voice") {
      interaction.reply({
        ephemeral: true,
        content: "Announcements cannot be made in voice channels."
      });
      return;
    }

    // TODO Save the watch config to the server config
    const watchConfig: WatchConfig = {
      anilistId,
      channelId: channel.id,
      createThreads,
      threadArchiveTime: threadArchiveTime as 60 | 1440 | 4320 | 10080
    }

    const media = (await query("query($id: Int!) { Media(id: $id) { id title { romaji } } }", { id: anilistId })).data.Media;
    interaction.reply({
      content: `Announcements will now be made for [${media.title.romaji}](https://anilist.co/anime/${media.id}) in ${channel.toString()}.`
    });
  }
}


const alIdRegex = /anilist\.co\/anime\/(.\d*)/;
const malIdRegex = /myanimelist\.net\/anime\/(.\d*)/;

export async function getMediaId(input: string): Promise<number | null> {
  // First we try directly parsing the input in case it's the standalone ID
  const output = parseInt(input);
  if (output)
    return output;

  // If that fails, we try parsing it with regex to pull the ID from an AniList link
  let match = alIdRegex.exec(input);
  // If there's a match, parse it and return that
  if (match)
    return parseInt(match[1]);

  // If that fails, we try parsing it with another regex to get an ID from a MAL link
  match = malIdRegex.exec(input);
  // If we can't find a MAL ID in the URL, just return null;
  if (!match)
    return null;

  return await query("query($malId: Int) { Media(idMal: $malId) { id } }", { malId: match[1] }).then(res => {
    if (res.errors) {
      console.log(JSON.stringify(res.errors));
      return;
    }

    return res.data.Media.id;
  });
}