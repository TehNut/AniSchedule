import { Client, ApplicationCommandData, CommandInteraction } from "discord.js";
import CommandWatch from "./CommandWatch";

export default abstract class Command {
  data: ApplicationCommandData;

  constructor(data: ApplicationCommandData) {
    this.data = data;
  }

  abstract handleInteraction(client: Client, interaction: CommandInteraction): Promise<void>;
}

export const commands: Command[] = [];