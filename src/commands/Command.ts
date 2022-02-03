import { PrismaClient, ServerConfig } from "@prisma/client";
import { Client, ApplicationCommandData, CommandInteraction, Snowflake, MessageComponentInteraction } from "discord.js";

export default abstract class Command {
  data: ApplicationCommandData;

  constructor(data: ApplicationCommandData) {
    this.data = data;
  }

  abstract handleInteraction(client: Client, interaction: CommandInteraction, prisma: PrismaClient): Promise<boolean>;

  async handleMessageComponents(client: Client, componentInteraction: MessageComponentInteraction, prisma: PrismaClient): Promise<boolean> {
    return false;
  }

  async getServerConfig(prisma: PrismaClient, serverId: Snowflake): Promise<ServerConfig> {
    let serverConfig = await prisma.serverConfig.findFirst({
      where: {
        serverId
      }
    });
    if (!serverConfig) {
      serverConfig = await prisma.serverConfig.create({
        data: {
          serverId,
          permission: "OWNER",
          titleFormat: "ROMAJI"
        }
      });
    }

    return serverConfig;
  }
}

export const commands: Command[] = [];