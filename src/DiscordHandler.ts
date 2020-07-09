import { Client, PrivateChannel, TextChannel } from "eris";
import { getStorage } from "./AniSchedule";
import Command, { commands } from "./command/Command";
import { checkPermission, getPermissionString } from "./Permission";

let client: Client;

export function createClient(): Client {
  return client ? client : client = new Client(process.env.BOT_TOKEN, { 
    autoreconnect: true,
    guildSubscriptions: false,
    disableEvents: {
      CHANNEL_CREATE: true,
      CHANNEL_DELETE: true,
      CHANNEL_UPDATE: true,
      GUILD_BAN_ADD: true,
      GUILD_BAN_REMOVE: true,
      GUILD_CREATE: false,
      GUILD_DELETE: true,
      GUILD_MEMBER_ADD: true,
      GUILD_MEMBER_DELETE: true,
      GUILD_MEMBER_UPDATE: true,
      GUILD_ROLE_CREATE: true,
      GUILD_ROLE_DELETE: true,
      GUILD_ROLE_UPDATE: true,
      GUILD_UPDATE: true,
      MESSAGE_CREATE: false,
      MESSAGE_DELETE: true,
      MESSAGE_DELETE_BULK: true,
      MESSAGE_UPDATE: true,
      PRESENCE_UPDATE: true,
      TYPING_START: true,
      USER_UPDATE: false,
      VOICE_STATE_UPDATE: true,
    },
    allowedMentions: {
      everyone: false,
      roles: false,
      users: false
    }
  });
};

export function setupClient(client: Client) {
  client.on("error", e => console.log(e));
  client.on("ready", () => {
    console.log(`Logged in as ${client.user.username}#${client.user.discriminator}`);
    console.log(`Joining ${client.guilds.size} servers: ${client.guilds.map(g => g.name).join(", ")}`);
  });
  client.on("messageCreate", message => {
    if ((message.channel as PrivateChannel).recipient)
      return;

    if (message.author.bot)
      return;

    const serverStorage = getStorage().getServerStorage((message.channel as TextChannel).guild);
    const messageSplit = message.content.split(" ");
    if (!messageSplit[0].startsWith(serverStorage.prefix))
      return; // Not a command

    // Strip prefix from command
    const usedCommand = messageSplit[0].substring(serverStorage.prefix.length);
    // Find the command in the array
    const command: Command = commands.find(c => c.options.name === usedCommand);
    if (!command)
      return;

    // If the command requires edit permissions, check for that
    if (command.options.checksPermission && !checkPermission(serverStorage.permission, message))
      message.channel.createMessage(getPermissionString(serverStorage.permission));

    // Finally, run the command and save any changes
    new Promise(resolve => {
      command.options.handler(resolve, message, messageSplit.slice(1), serverStorage, serverStorage.getChannelStorage(message.channel), client);
    }).then(() => getStorage().save());
  });
}