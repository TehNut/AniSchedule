import { Channel, GuildChannel, Message, Constants } from "eris";

export enum Type {
  ANY,
  CHANNEL_MANAGER,
  SERVER_OWNER
};

export function getPermissionString(permission: Type): string | null {
  switch(permission) {
    case Type.SERVER_OWNER: return "May only be used by the server owner.";
    case Type.CHANNEL_MANAGER: return "Requires the Channel Manager permission.";
    default: return null;
  }
}

export function checkPermission(permission: Type, message: Message) {
  switch (permission) {
    case Type.SERVER_OWNER: message.author.id === (message.channel as GuildChannel).guild.ownerID;
    case Type.CHANNEL_MANAGER: (message.channel as GuildChannel).permissionsOf(message.author.id).has("MANAGE_CHANNELS");
    default: return true;
  }
}