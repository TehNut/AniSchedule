import { Client, ApplicationCommandData, CommandInteraction, Snowflake } from "discord.js";
import { ServerConfig } from "../Model";

export default abstract class Command {
  data: ApplicationCommandData;

  constructor(data: ApplicationCommandData) {
    this.data = data;
  }

  abstract handleInteraction(client: Client, interaction: CommandInteraction, data: Record<Snowflake, ServerConfig>): Promise<boolean>;
}

export const commands: Command[] = [];