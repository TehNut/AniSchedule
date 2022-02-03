import { config } from "dotenv";
config();
import { ApplicationCommand, Client, CommandInteraction, Intents, MessageComponentInteraction, Snowflake } from "discord.js";
import { BOT_TOKEN, DEV_SERVER_ID, MODE, SET_ACTIVITY } from "./Constants";
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
import { convertDataJson, getUniqueMediaIds } from "./Util";
import { PrismaClient } from "@prisma/client";

commands.push(new CommandWatch());
commands.push(new CommandUnwatch());
commands.push(new CommandWatching());
commands.push(new CommandEdit());
commands.push(new CommandTitleFormat());
commands.push(new CommandAbout());
commands.push(new CommandUpcoming());
commands.push(new CommandPermission());

const commandIds: Record<string, { id: Snowflake, command: ApplicationCommand }> = {};
const prisma = new PrismaClient();
export const client = new Client({
  intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES ]
});

async function init() {
  await convertDataJson(prisma); // TODO remove
  await initScheduler(prisma);
  await client.login(BOT_TOKEN);
  console.log(`Logged in as ${client.user.username}#${client.user.discriminator}`);
}

client.on("ready", async () => {
  const commandManager = MODE === "DEV" ? client.guilds.cache.get(DEV_SERVER_ID as Snowflake).commands : client.application.commands;
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
  });

  if (SET_ACTIVITY) {
    getUniqueMediaIds(prisma).then(uniqueIds => {
      // Set the initial activity count at launch
      client.user.setActivity({ type: "WATCHING", name: `${uniqueIds.length} airing anime` });
    });
  }
});

client.on("error", e => {
  console.log("Error occurred", e);

  // Make sure we stay logged in if we disconnect
  client.login(BOT_TOKEN)
});

process.on("unhandledRejection", e => {
  console.log("Error occurred", e);
  
  // Make sure we stay logged in if we disconnect
  client.login(BOT_TOKEN);
})

client.on("interactionCreate", async interaction => {
  // For now, all interactions must be in a guild
  if (interaction.isCommand() && !interaction.inGuild()) {
    (interaction as CommandInteraction).reply({
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

  await command.handleInteraction(client, interaction, prisma)
}

async function handleMessageComponents(interaction: MessageComponentInteraction) {
  // Allow components to use IDs as a way to direct to the correct command by specifying the command name before a ":" 
  const idSplit = interaction.customId.split(":");
  const command = commands.find(c => c.data.name === idSplit[0]);
  if (command) {
    // Strip the command name off the ID so it can be more useful to the command
    interaction.customId = idSplit[1];
    await command.handleMessageComponents(client, interaction, prisma)
  }
}

init();

export function getCommand(commandName: string): { id: Snowflake, command: ApplicationCommand } | null {
  return commandIds[commandName];
}