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
}

export const commands: Command[] = [];