import { Client, CommandInteraction, Snowflake } from "discord.js";
import { ServerConfig } from "../Model";
import Command from "./Command";

export default class CommandConfig extends Command {

  constructor() {
    super({
      name: "title",
      description: "Changes the title display for this server.",
      defaultPermission: false,
      options: [
        {
          name: "format",
          description: "The title display format to be used.",
          type: "STRING",
          required: true,
          choices: [
            { name: "Native", value: "native" },
            { name: "Romaji", value: "romaji" },
            { name: "English (Romaji fallback)", value: "english" }
          ]
        }
      ]
    }); 
  }

  async handleInteraction(client: Client, interaction: CommandInteraction, data: Record<Snowflake, ServerConfig>): Promise<boolean> {
    // TODO Check permission
    const { value: format } = interaction.options.get("format") as { value: string };
     
    let serverConfig: ServerConfig = data[interaction.guildId];
    if (!serverConfig) {
      serverConfig = data[interaction.guildId] = {
        permission: "OWNER",
        titleFormat: "ROMAJI",
        watching: []
      } as ServerConfig;
    }

    serverConfig.titleFormat = format.toUpperCase() as "NATIVE" | "ROMAJI" | "ENGLISH";
    interaction.reply({
      ephemeral: true,
      content: `From now on, media titles will use the ${format} format`
    });
    return true;
  }
}