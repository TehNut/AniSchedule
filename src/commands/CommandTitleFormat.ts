import { TitleFormat } from "../Model";
import { Command, getServerConfig } from "./Command";

const command: Command = {
  name: "title",
  async handleInteraction(client, interaction, prisma) {
    const { value: format } = interaction.options.get("format") as { value: string };
    
    // Intializes if it's not already
    const serverConfig = await getServerConfig(prisma, interaction.guildId);
    await prisma.serverConfig.update({
      where: {
        id: serverConfig.id
      },
      data: {
        titleFormat: format.toUpperCase() as TitleFormat
      }
    });
    
    interaction.reply({
      ephemeral: true,
      content: `From now on, media titles will use the ${format} format`
    });
    return true;
  },
};

export default command;