import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { Command } from "./Command";
import { version } from "../../package.json";
import { formatTime } from "../Util";

const startedAt = Math.floor(Date.now() / 1000);

const command: Command = {
  name: "about",
  handleInteraction(client, interaction, prisma) {
    interaction.reply({
      ephemeral: true,
      embeds: [ 
        new MessageEmbed()
          .setTitle(`${client.user.username} v${version}`)
          .setAuthor({ name: client.user.username, iconURL: client.user.avatarURL()})
          .setColor(43775)
          .setDescription("Anime episode airing announcements based on the **[AniList](https://anilist.co)** airing schedule.")
          .setFooter({ text: `Uptime: ${formatTime(Math.floor(Date.now() / 1000) - startedAt, true)}` })
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
  },
}

export default command;