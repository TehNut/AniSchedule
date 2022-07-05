import { config } from "dotenv";
config();
import { Client, CommandInteraction, Intents, MessageComponentInteraction } from "discord.js";
import { createLogger, transports, format } from "winston";
import { BOT_TOKEN, MODE, SET_ACTIVITY } from "./Constants";
import { commands } from "./commands/Command";
import { initScheduler } from "./Scheduler";
import { convertDataJson, getUniqueMediaIds } from "./Util";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const client = new Client({
  intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES ]
});
export const logger = createLogger({
  level: MODE === "DEV" ? "debug" : "info",
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    verbose: 5,
    silly: 6
  },
  transports: new transports.Console({
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      format.align(),
      format.printf(info => `[${info.timestamp}] [${info.level}] ${info.message}`)
    )
  })
});

async function init() {
  await convertDataJson(prisma); // TODO remove
  await initScheduler(prisma);
  await client.login(BOT_TOKEN);
  logger.info(`Logged in as ${client.user.username}#${client.user.discriminator}`);
}

client.on("ready", async () => {
  if (SET_ACTIVITY) {
    getUniqueMediaIds(prisma).then(uniqueIds => {
      // Set the initial activity count at launch
      client.user.setActivity({ type: "WATCHING", name: `${uniqueIds.length} airing anime` });
    });
  }
});

// Setup new server
client.on("guildCreate", async guild => {
  try {
    await prisma.serverConfig.create({
      data: {
        serverId: guild.id,
        permission: "OWNER",
        permissionRoleId: null,
        titleFormat: "ROMAJI"
      }
    });
  } catch (e) {
    logger.error("Failed to create default server configuration: ", e)
  }

  logger.info(`Joined new server: ${guild.name}`);
});

client.on("error", e => {
  logger.error("Error occurred", e);

  // Make sure we stay logged in if we disconnect
  client.login(BOT_TOKEN)
});

process.on("unhandledRejection", e => {
  logger.error("Error occurred", e);
  
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
    logger.error("Error handing interaction", e);
  }
});

async function handleCommands(interaction: CommandInteraction) {
  const command = commands.find(c => c.name === interaction.commandName);
  if (!command) {
    logger.warn(`Discord has passed unknown command "${interaction.commandName}" to us.`);
    return;
  }

  try {
    await command.handleInteraction(client, interaction, prisma)
  } catch (e) {
    logger.error(e);
  }
}

async function handleMessageComponents(interaction: MessageComponentInteraction) {
  // Allow components to use IDs as a way to direct to the correct command by specifying the command name before a ":" 
  const idSplit = interaction.customId.split(":");
  const command = commands.find(c => c.name === idSplit[0]);
  if (command) {
    // Strip the command name off the ID so it can be more useful to the command
    interaction.customId = idSplit[1];
    await command.handleMessageComponents(client, interaction, prisma)
  }
}

init();