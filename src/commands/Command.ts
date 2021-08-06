import { Client, ApplicationCommandData, CommandInteraction, Snowflake, ButtonInteraction, MessageComponentInteraction } from "discord.js";
import { ServerConfig } from "../Model";

export default abstract class Command {
  data: ApplicationCommandData;

  constructor(data: ApplicationCommandData) {
    this.data = data;
  }

  abstract handleInteraction(client: Client, interaction: CommandInteraction, data: Record<Snowflake, ServerConfig>): Promise<boolean>;

  async handleMessageComponents(client: Client, componentInteraction: MessageComponentInteraction, data: Record<Snowflake, ServerConfig>): Promise<boolean> {
    return false;
  }

  getServerConfig(data: Record<Snowflake, ServerConfig>, serverId: Snowflake): ServerConfig {
    let serverConfig: ServerConfig = data[serverId];
    if (!serverConfig) {
      serverConfig = data[serverId] = {
        permission: "OWNER",
        titleFormat: "ROMAJI",
        watching: []
      } as ServerConfig;
    }

    return serverConfig;
  }
}

export const commands: Command[] = [];