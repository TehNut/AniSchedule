import { Client, CommandInteraction, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { ServerConfig } from "../Model";
import Command from "./Command";
import { version } from "../../package.json";
import { formatTime } from "../Util";

const startedAt = Math.floor(Date.now() / 1000);

export default class CommandAbout extends Command {

  constructor() {
    super({
      name: "about",
      description: "Displays information about this bot."
    });
  }

  async handleInteraction(client: Client, interaction: CommandInteraction, data: Record<`${bigint}`, ServerConfig>): Promise<boolean> {
    interaction.reply({
      ephemeral: true,
      embeds: [ 
        new MessageEmbed()
          .setTitle(`${client.user.username} v${version}`)
          .setAuthor(client.user.username, client.user.avatarURL())
          .setColor(43775)
          .setDescription("Anime episode airing announcements based on the **[AniList](https://anilist.co)** airing schedule.")
          .setFooter(`Uptime: ${formatTime(Math.floor(Date.now() / 1000) - startedAt, true)}`)
      ],
      components: [
        new MessageActionRow({
          components: [
            new MessageButton({
              style: "LINK",
              url: "https://anilist.co/user/42069",
              label: "Author"
            }),
            new MessageButton({
              style: "LINK",
              url: "https://github.com/TehNut/AniSchedule",
              label: "GitHub"
            }),
          ]
        })
      ]
    });
    return false;
  }
}