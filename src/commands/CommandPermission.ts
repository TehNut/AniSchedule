import { ApplicationCommandPermissionData, Client, CommandInteraction, Snowflake } from "discord.js";
import { getCommand } from "../AniSchedule";
import { PermissionType, ServerConfig } from "../Model";
import Command from "./Command";

export default class CommandPermission extends Command {
  constructor() {
    super({
      name: "permission",
      description: "Sets the permission requirement to make modifications. Server owner only.",
      defaultPermission: false,
      options: [
        {
          name: "type",
          description: "The type of permission handling to use.",
          type: "STRING",
          required: true,
          choices: [
            { name: "Any User", value: "ANY" },
            { name: "Specific Role", value: "ROLE" },
            { name: "Owner Only", value: "OWNER" },
          ]
        },
        {
          name: "role",
          description: "If \"Specific Role\" was chosen as the type",
          type: "ROLE"
        }
      ]
    });
  }

  async handleInteraction(client: Client, interaction: CommandInteraction, data: Record<Snowflake, ServerConfig>): Promise<boolean> {
    if (interaction.user.id !== interaction.guild.ownerId) {
      interaction.reply({
        content: "Only the server owner can use this command.",
        ephemeral: true
      });
      return false;
    }

    const serverConfig = this.getServerConfig(data, interaction.guildId);
    const permissionType: PermissionType = interaction.options.getString("type") as PermissionType;

    if (permissionType === "ROLE") {
      if (!interaction.options.getRole("role")) {
        interaction.reply({
          content: "If you set the type as role, you must choose a role",
          ephemeral: true
        });
        return false;
      }

      serverConfig.permissionRoleId = interaction.options.get("role").role.id;
    }
    serverConfig.permission = permissionType;

    let response = "";
    let permission: ApplicationCommandPermissionData;
    switch(serverConfig.permission) {
      case "ANY": {
        permission = {
          type: "ROLE",
          id: interaction.guild.roles.everyone.id,
          permission: true,
        };
        response = "any user";
        break;
      }
      case "ROLE": {
        permission = {
          type: "ROLE",
          id: serverConfig.permissionRoleId,
          permission: true
        };
        response = `any member of the ${interaction.options.get("role").role} role`;
        break;
      }
      case "OWNER": {
        permission = {
          type: "USER",
          id: interaction.guild.ownerId,
          permission: true
        }
        response = "only the owner"
        break;
      }
    }

    await interaction.guild.commands.permissions.set({
      fullPermissions: [
        {
          id: getCommand("watch").id,
          permissions: [ permission ]
        },
        {
          id: getCommand("unwatch").id,
          permissions: [ permission ]
        },
        {
          id: getCommand("title").id,
          permissions: [ permission ]
        },
        {
          id: getCommand("edit").id,
          permissions: [ permission ]
        }
      ]
    });

    interaction.reply({
      content: `From now on, ${response} can use edit commands.`,
      ephemeral: true
    });
    
    return true;
  }
}