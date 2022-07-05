import { config as loadEnv } from "dotenv";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandChannelOption, SlashCommandIntegerOption, SlashCommandRoleOption, SlashCommandStringOption } from "@discordjs/builders";
import { Permissions } from "discord.js";
import { ThreadArchiveTime } from "./Model";

loadEnv();

const commands = [
  new SlashCommandBuilder()
    .setName("about")
    .setDescription("Displays information about this bot."),
  new SlashCommandBuilder()
    .setName("edit")
    .setDescription("Updates an existing announcement configuration.")
    .setDefaultMemberPermissions(Permissions.FLAGS.MANAGE_CHANNELS)
    .setDMPermission(false)
    .addStringOption(new SlashCommandStringOption().setName("anime").setDescription("This can be an AniList ID, AniList URL, or MyAnimeListURL").setRequired(true))
    .addChannelOption(new SlashCommandChannelOption().setName("channel").setDescription("The channel the announcement is being made in. Defaults to current channel."))
    .addRoleOption(new SlashCommandRoleOption().setName("mention_role").setDescription("A role to mention when the announcement is made."))
    .addBooleanOption(new SlashCommandBooleanOption().setName("remove_mention").setDescription("Removes a previously set role mention."))
    .addBooleanOption(new SlashCommandBooleanOption().setName("create_threads").setDescription("Should discussion threads be created for each episode. [false]."))
    .addIntegerOption(new SlashCommandIntegerOption()
      .setName("thread_archive")
      .setDescription("How long after the last message before the thread is archived. [1 day]")
      .addChoices(
        { name: "1 Hour", value: ThreadArchiveTime.ONE_HOUR },
        { name: "1 Day", value: ThreadArchiveTime.ONE_DAY },
        { name: "3 Days", value: ThreadArchiveTime.THREE_DAYS },
        { name: "7 days", value: ThreadArchiveTime.SEVEN_DAYS },
      )
    ),
  new SlashCommandBuilder()
    .setName("title")
    .setDescription("Changes the title display for this server.")
    .setDefaultMemberPermissions(Permissions.FLAGS.MANAGE_CHANNELS)
    .addStringOption(new SlashCommandStringOption()
      .setName("format")
      .setDescription("The title display format to be used.")
      .setRequired(true)
      .addChoices(
        { name: "Native", value: "native" },
        { name: "Romaji", value: "romaji" },
        { name: "English (Romaji fallback)", value: "english" }
      )
    ),
  new SlashCommandBuilder()
    .setName("unwatch")
    .setDescription("Removes an anime announcement")
    .setDefaultMemberPermissions(Permissions.FLAGS.MANAGE_CHANNELS)
    .addStringOption(new SlashCommandStringOption().setName("anime").setDescription("This can be an AniList ID, AniList URL, or MyAnimeList URL.").setRequired(true))
    .addChannelOption(new SlashCommandChannelOption().setName("channel").setDescription("The channel to remove the announcements from. Defaults to current channel.")),
  new SlashCommandBuilder()
    .setName("upcoming")
    .setDescription("Lists upcoming episodes.")
    .addIntegerOption(new SlashCommandIntegerOption().setName("days").setDescription("How many days ahead you'd like to see. Defaults to 1 day.").setMaxValue(7).setMinValue(1)),
  new SlashCommandBuilder()
    .setName("watch")
    .setDescription("Adds a new anime to be watched")
    .setDefaultMemberPermissions(Permissions.FLAGS.MANAGE_CHANNELS)
    .addStringOption(new SlashCommandStringOption().setName("anime").setDescription("This can be an AniList ID, AniList URL, or MyAnimeListURL").setRequired(true))
    .addChannelOption(new SlashCommandChannelOption().setName("channel").setDescription("The channel the announcement is being made in. Defaults to current channel."))
    .addRoleOption(new SlashCommandRoleOption().setName("mention_role").setDescription("A role to mention when the announcement is made."))
    .addBooleanOption(new SlashCommandBooleanOption().setName("create_threads").setDescription("Should discussion threads be created for each episode. [false]."))
    .addIntegerOption(new SlashCommandIntegerOption()
      .setName("thread_archive")
      .setDescription("How long after the last message before the thread is archived. [1 day]")
      .addChoices(
        { name: "1 Hour", value: ThreadArchiveTime.ONE_HOUR },
        { name: "1 Day", value: ThreadArchiveTime.ONE_DAY },
        { name: "3 Days", value: ThreadArchiveTime.THREE_DAYS },
        { name: "7 days", value: ThreadArchiveTime.SEVEN_DAYS },
      )
    ),
  new SlashCommandBuilder()
    .setName("watching")
    .setDescription("Lists the anime announcements for a channel.")
    .addChannelOption(new SlashCommandChannelOption().setName("channel").setDescription("The channel to check announcements for. Defaults to current channel"))
].map(c => c.toJSON());

const applicationId = process.env.APPLICATION_ID;
const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN);
const route = process.env.MODE === "PROD" ? Routes.applicationCommands(applicationId) : Routes.applicationGuildCommands(applicationId, process.env.DEV_SERVER_ID);

rest.put(route, { body: [ ...commands ] })
  .then(() => console.log("Successfully registered application commands."))
	.catch(console.error);