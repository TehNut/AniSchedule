import { Message, Client } from "eris";
import { ServerStorage, ChannelStorage } from "../DataStore";

type CommandHandler = (resolve: Function, message: Message, args: string[], serverStorage: ServerStorage, ChannelStorage: ChannelStorage, client: Client) => void;

export const commands: Command[] = [];

export default class Command {
  options: CommandOptions;

  constructor(options: CommandOptions) {
    this.options = options;
    commands.push(this);
  }
}

interface CommandOptions {
  name: string;
  description: string;
  checksPermission?: boolean;
  handler: CommandHandler;
}

import "./CommandHelp";
import "./CommandWatch";
import "./CommandUnwatch";
import "./CommandWatching";
import "./CommandNext";
import "./CommandPermission";
import "./CommandPrefix";
import "./CommandNextDay";

