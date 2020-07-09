import { checkPermission, Type } from "../Permission";
import Command from "./Command";

export default new Command({
  name: "permission",
  description: "Allows the server owner to set the permission required for modification-based commands.\n`ANY`, `CHANNEL_MANAGER`, `SERVER_OWNER`",
  checksPermission: true,
  handler(resolve, message, args, serverStore, channelStore, client) {
    if (checkPermission(Type.SERVER_OWNER, message)) {
      let flag = true;
      switch (args[0]) {
        case "ANY": serverStore.permission = Type.ANY;
        case "CHANNEL_MANAGER": serverStore.permission = Type.CHANNEL_MANAGER;
        case "SERVER_OWNER": serverStore.permission = Type.SERVER_OWNER;
        default: flag = false;
      }
      message.addReaction(flag ? "👍" : "👎");
    }
    else
      message.addReaction("👎");
    resolve();
  }
});
