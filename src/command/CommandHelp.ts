import { EmbedOptions } from "eris";
import { getPermissionString } from "../Permission";
import { reply } from "../Util";
import Command, { commands } from "./Command";

export default new Command({
  name: "help",
  description: "Prints out all available commands with a short description.",
  handler: (resolve, message, args, serverStore, channelStore, client) => {
    const embed: EmbedOptions = {
      title: "AniSchedule Commands",
      author: {
        name: "AniSchedule",
        url: "https://anilist.co",
        icon_url: client.user.avatarURL
      },
      color: 4044018,
      description: `[GitHub](https://github.com/TehNut/AniSchedule) • [Author](https://anilist.co/user/42069/)\nFor information on a specific command, use \`${serverStore.prefix}help <command>\`. Do not use the prefix for getting specific command help.`,
      fields: []
    };

    if (args.length > 0) {
      const searched = commands.find(c => c.options.name.toLowerCase() === args[0].toLowerCase());
      if (!searched) {
        reply(message, `Unknown command name "${args[0]}"`);
        return resolve();
      }

      embed.title = `\`${searched.options.name}\` Information`;
      let description = searched.options.description;
      if (searched.options.checksPermission)
        description += `\n${getPermissionString(serverStore.permission)}`;
      embed.description = description;
    }
    else {
      commands.filter(c => c.options.name !== "help").forEach(command => {
        embed.description += `\n• \`${serverStore.prefix}${command.options.name}\``;
      });
    }

    message.channel.createMessage({ 
      embed,
      messageReferenceID: message.id
     });
    resolve();
  }
});
