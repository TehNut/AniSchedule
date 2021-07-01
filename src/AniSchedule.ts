import { config } from "dotenv";
config();
import { readFileSync, writeFileSync, existsSync } from "fs";
import { Client, CommandInteraction, Intents, Snowflake } from "discord.js";
import { ServerConfig } from "./Model";
import { commands } from "./commands/Command";
import CommandWatch from "./commands/CommandWatch";
import CommandUnwatch from "./commands/CommandUnwatch";
import CommandWatching from "./commands/CommandWatching";
import CommandEdit from "./commands/CommandEdit";
import CommandTitleFormat from "./commands/CommandTitleFormat";

commands.push(new CommandWatch());
commands.push(new CommandUnwatch());
commands.push(new CommandWatching());
commands.push(new CommandEdit());
commands.push(new CommandTitleFormat());

let data: Record<Snowflake, ServerConfig> = function() {
  if (existsSync("./data.json"))
    return JSON.parse(readFileSync("./data.json", "utf-8"));

  writeFileSync("./data.json", "{}", { encoding: "utf-8" });
  return {};
}();
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
});

client.login(process.env.BOT_TOKEN);

async function handleCommands(interaction: CommandInteraction) {
  const command = commands.find(c => c.data.name === interaction.command.name);
  if (await command.handleInteraction(client, interaction, data))
    writeFileSync("./data.json", JSON.stringify(data, null, process.env.MODE === "DEV" ? 2 : 0));
}