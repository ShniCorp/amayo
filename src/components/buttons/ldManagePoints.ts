import logger from "../../core/lib/logger";
import { ButtonInteraction, MessageFlags } from "discord.js";
import { prisma } from "../../core/database/prisma";
import { ComponentType, TextInputStyle } from "discord-api-types/v10";
import { hasManageGuildOrStaff } from "../../core/lib/permissions";

export default {
  customId: "ld_manage_points",
  run: async (interaction: ButtonInteraction) => {
    if (!interaction.guild) {
      return interaction.reply({
        content: "❌ Solo disponible en servidores.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Verificar permisos (ManageGuild o rol de staff)
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const allowed = await hasManageGuildOrStaff(
      member,
      interaction.guild.id,
      prisma
    );
    if (!allowed) {
      return interaction.reply({
        content: "❌ Solo admins o staff pueden gestionar puntos.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      // Obtener estadísticas para filtrar usuarios disponibles
      const stats = await prisma.partnershipStats.findMany({
        where: { guildId: interaction.guild.id },
        orderBy: { totalPoints: "desc" },
        take: 25, // Discord limita a 25 opciones en select menus
      });

      if (stats.length === 0) {
        return interaction.reply({
          content: "❌ No hay usuarios con puntos en este servidor todavía.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // v14 Modal API - Modals can ONLY contain TextInput, not UserSelect
      // User will enter the User ID manually
      const {
        ModalBuilder,
        TextInputBuilder,
        ActionRowBuilder,
        TextInputStyle: V14TextInputStyle,
      } = await import("discord.js");

      // Build list of users for helper text
      const usersList = stats
        .slice(0, 10)
        .map((s, i) => `${i + 1}. ID: ${s.userId} (${s.totalPoints} pts)`)
        .join("\\n");

      const userIdInput = new TextInputBuilder()
        .setCustomId("user_id_input")
        .setLabel("User ID del usuario a modificar")
        .setStyle(V14TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder("Ej: 123456789012345678")
        .setMinLength(17)
        .setMaxLength(20);

      const pointsInput = new TextInputBuilder()
        .setCustomId("points_input")
        .setLabel("Modificar Puntos")
        .setStyle(V14TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder("+50 (añadir) / -20 (quitar) / =100 (establecer)")
        .setMinLength(1)
        .setMaxLength(10);

      const modal = new ModalBuilder()
        .setCustomId("ld_points_modal")
        .setTitle("Gestionar Puntos de Alianza")
        .addComponents(
          //@ts-ignore
          new ActionRowBuilder().addComponents(userIdInput),
          //@ts-ignore
          new ActionRowBuilder().addComponents(pointsInput)
        );

      await interaction.showModal(modal);
    } catch (e) {
      // @ts-ignore
      logger.error("Error en ldManagePoints:", e as Error);
      await interaction.reply({
        content: "❌ Error al abrir el modal de gestión.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
