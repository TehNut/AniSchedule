import { PrismaClient } from "@prisma/client";
import { Client, CommandInteraction } from "discord.js";
import { TitleFormat } from "../Model";
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

  async handleInteraction(client: Client, interaction: CommandInteraction, prisma: PrismaClient): Promise<boolean> {
    // TODO Check permission
    const { value: format } = interaction.options.get("format") as { value: string };
    
    // Intializes if it's not already
    const serverConfig = await this.getServerConfig(prisma, interaction.guildId);
    await prisma.serverConfig.update({
      where: {
        id: serverConfig.id
      },
      data: {
        titleFormat: format.toUpperCase() as TitleFormat
      }
    });
    
    interaction.reply({
      ephemeral: true,
      content: `From now on, media titles will use the ${format} format`
    });
    return true;
  }
}