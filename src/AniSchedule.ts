import { config } from "dotenv";
config();
import { readFileSync, writeFileSync, existsSync } from "fs";
import { ApplicationCommand, Client, CommandInteraction, Intents, MessageComponentInteraction, Snowflake } from "discord.js";
import { ServerConfig } from "./Model";
import { commands } from "./commands/Command";
import CommandWatch from "./commands/CommandWatch";
import CommandUnwatch from "./commands/CommandUnwatch";
import CommandWatching from "./commands/CommandWatching";
import CommandEdit from "./commands/CommandEdit";
import CommandTitleFormat from "./commands/CommandTitleFormat";
import CommandAbout from "./commands/CommandAbout";
import { initScheduler } from "./Scheduler";
import CommandUpcoming from "./commands/CommandUpcoming";
import CommandPermission from "./commands/CommandPermission";

commands.push(new CommandWatch());
commands.push(new CommandUnwatch());
commands.push(new CommandWatching());
commands.push(new CommandEdit());
commands.push(new CommandTitleFormat());
commands.push(new CommandAbout());
commands.push(new CommandUpcoming());
commands.push(new CommandPermission());

const commandIds: Record<string, { id: Snowflake, command: ApplicationCommand }> = {};

let data: Record<Snowflake, ServerConfig> = function() {
  if (existsSync("./data.json"))
    return JSON.parse(readFileSync("./data.json", "utf-8"));

  writeFileSync("./data.json", "{}", { encoding: "utf-8" });
  return {};
}();
export const client = new Client({
  intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES ]
});

async function init() {
  await initScheduler(data);
  await client.login(process.env.BOT_TOKEN);
  console.log(`Logged in as ${client.user.username}#${client.user.discriminator}`);
}

client.on("ready", async () => {
  const commandManager = process.env.MODE === "DEV" ? client.guilds.cache.get(process.env.DEV_SERVER_ID as Snowflake).commands : client.application.commands;
  const response = await commandManager.set(commands.map(c => c.data));
  response.forEach((command, id) => commandIds[command.name] = { id, command });

  client.guilds.cache.forEach(async guild => {
    if (!guild.commands.cache.has(commandIds["permission"].id))
      return;
      
    await guild.commands.permissions.add({
      command: commandIds["permission"].command,
      permissions: [
        {
          id: guild.ownerId,
          type: "USER",
          permission: true
        }
      ]
    });
  })
});

client.on("interactionCreate", async interaction => {
  // For now, all interactions must be in a guild
  if (!interaction.inGuild() && interaction.isCommand()) {
    interaction.reply({
      content: `${client.user.username} does not allow commands to be used in direct messages at this moment.`
    });
    return;
  }
    
  try {
    if (interaction.isCommand())
      await handleCommands(interaction);

    if (interaction.isMessageComponent())
      await handleMessageComponents(interaction);
  } catch (e) {
    console.error("Error handing interaction", e);
  }
});

async function handleCommands(interaction: CommandInteraction) {
  const command = commands.find(c => c.data.name === interaction.commandName);
  if (!command) {
    console.error(`Discord has passed unknown command "${interaction.commandName}" to us.`);
    return;
  }
  if (await command.handleInteraction(client, interaction, data))
    writeFileSync("./data.json", JSON.stringify(data, null, process.env.MODE === "DEV" ? 2 : 0));
}

async function handleMessageComponents(interaction: MessageComponentInteraction) {
  // Allow components to use IDs as a way to direct to the correct command by specifying the command name before a ":" 
  const idSplit = interaction.customId.split(":");
  const command = commands.find(c => c.data.name === idSplit[0]);
  if (command) {
    // Strip the command name off the ID so it can be more useful to the command
    interaction.customId = idSplit[1];
    if (await command.handleMessageComponents(client, interaction, data))
      writeFileSync("./data.json", JSON.stringify(data, null, process.env.MODE === "DEV" ? 2 : 0));
  }
}

init();

export function getCommand(commandName: string): { id: Snowflake, command: ApplicationCommand } | null {
  return commandIds[commandName];
}