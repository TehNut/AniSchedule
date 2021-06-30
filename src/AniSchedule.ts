import { config } from "dotenv";
config();
import { ButtonInteraction, Client, CommandInteraction, Intents, Snowflake } from "discord.js";
import { commands } from "./commands/Command";
import CommandWatch from "./commands/CommandWatch";

commands.push(new CommandWatch());

const client = new Client({
  intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES ]
});

client.on("ready", async () => {
  const commandManager = process.env.MODE === "DEV" ? client.guilds.cache.get(process.env.DEV_SERVER_ID as Snowflake).commands : client.application.commands;
  await commandManager.set(commands.map(c => c.data));
});

client.on("interaction", async interaction => {
  if (interaction.isCommand())
    await handleCommands(interaction);
  if (interaction.isButton())
    await handleButtons(interaction);
});

client.login(process.env.BOT_TOKEN);

async function handleCommands(interaction: CommandInteraction) {
  const command = commands.find(c => c.data.name === interaction.command.name);
  await command.handleInteraction(client, interaction);
}

async function handleButtons(interaction: ButtonInteraction) {

}