import { PrismaClient, ServerConfig } from "@prisma/client";
import { Client, CommandInteraction, Snowflake, MessageComponentInteraction } from "discord.js";
import CommandAbout from "./CommandAbout"; 
import CommandEdit from "./CommandEdit";
import CommandTitleFormat from "./CommandTitleFormat";
import CommandUnwatch from "./CommandUnwatch";
import CommandUpcoming from "./CommandUpcoming";
import CommandWatch from "./CommandWatch";
import CommandWatching from "./CommandWatching";

type PromiseOrNotIDontCare<T> = Promise<T> | T;
type InteractionHandler = (client: Client, interaction: CommandInteraction, prisma: PrismaClient) => PromiseOrNotIDontCare<boolean>;
type MessageComponentHandler = (client: Client, componentInteraction: MessageComponentInteraction, prisma: PrismaClient) => PromiseOrNotIDontCare<boolean>;

export interface Command {
  name: string,
  handleInteraction?: InteractionHandler;
  handleMessageComponents?: MessageComponentHandler;
}

export async function getServerConfig(prisma: PrismaClient, serverId: Snowflake): Promise<ServerConfig> {
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

export const commands: Command[] = [
  CommandAbout,
  CommandEdit,
  CommandTitleFormat,
  CommandUnwatch,
  CommandUpcoming,
  CommandWatch,
  CommandWatching
];