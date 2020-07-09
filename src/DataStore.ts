import { Channel, Guild, TextChannel } from "eris";
import { Type as ObjectType, Transform, classToPlain } from "class-transformer";
import "reflect-metadata";
import { writeFile } from "fs";
import { Type } from "./Permission";

export default class Storage {
  @ObjectType(() => ServerStorage)
  servers: ServerStorage[] = [];

  public getServerStorage(guild: Guild): ServerStorage {
    let storage = this.servers.find(storage => storage.guildId === guild.id);
    if (!storage)
      this.servers.push(storage = new ServerStorage(guild));

    return storage;
  }

  public getChannelStorage(channel: Channel): ChannelStorage {
    return this.getServerStorage((channel as TextChannel).guild).getChannelStorage(channel);
  }

  public save(): Promise<void> {
    return new Promise(resolve => {
      writeFile("./data.json", JSON.stringify(classToPlain(this)), err => {
        if (err)
          console.log("Error saving data", err);

        resolve();
      });
    });
  }
}

export class ServerStorage {
  guildId: string;
  @ObjectType(() => ChannelStorage)
  channels: ChannelStorage[] = [];
  permission: Type = Type.SERVER_OWNER;
  prefix: string = "?as";

  constructor(guild: Guild) {
    this.guildId = guild ? guild.id : undefined;
  }

  getChannelStorage(channel: Channel): ChannelStorage {
    let storage = this.channels.find(storage => storage.channelId === channel.id);
    if (!storage)
      this.channels.push(storage = new ChannelStorage(channel));

    return storage;
  }
}

export class ChannelStorage {
  channelId: string;
  shows: number[] = [];

  constructor(channel: Channel) {
    this.channelId = channel ? channel.id : undefined;
  }
}