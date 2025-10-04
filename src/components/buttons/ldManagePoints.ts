import logger from "../../core/lib/logger";
import { 
  ButtonInteraction, 
  MessageFlags, 
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  ActionRowBuilder
} from 'discord.js';
import { prisma } from '../../core/database/prisma';

export default {
  customId: 'ld_manage_points',
  run: async (interaction: ButtonInteraction) => {
    if (!interaction.guild) {
      return interaction.reply({ 
        content: '❌ Solo disponible en servidores.', 
        flags: MessageFlags.Ephemeral 
      });
    }

    // Verificar permisos de administrador
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ Solo los administradores pueden gestionar puntos.',
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      // Obtener todos los usuarios con puntos en este servidor
      const stats = await prisma.partnershipStats.findMany({
        where: { guildId: interaction.guild.id },
        orderBy: { totalPoints: 'desc' },
        take: 25 // Discord limita a 25 opciones en select menus
      });

      if (stats.length === 0) {
        return interaction.reply({
          content: '❌ No hay usuarios con puntos en este servidor todavía.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Construir opciones del select menu
      const options = await Promise.all(
        stats.map(async (stat) => {
          let displayName = 'Usuario desconocido';
          try {
            const member = await interaction.guild!.members.fetch(stat.userId);
            displayName = member.displayName || member.user.username;
          } catch {
            try {
              const user = await interaction.client.users.fetch(stat.userId);
              displayName = user.username;
            } catch {
              // Mantener el nombre por defecto
            }
          }

          return {
            label: displayName,
            description: `Total: ${stat.totalPoints} | Semanal: ${stat.weeklyPoints} | Mensual: ${stat.monthlyPoints}`,
            value: stat.userId
          };
        })
      );

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ld_select_user')
        .setPlaceholder('Selecciona un usuario para gestionar sus puntos')
        .addOptions(options);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(selectMenu);

      await interaction.reply({
        content: '### ⚙️ Gestión de Puntos\nSelecciona el usuario al que deseas modificar los puntos:',
        components: [row],
        flags: MessageFlags.Ephemeral
      });
    } catch (e) {
      logger.error({ err: e }, 'Error en ldManagePoints');
      await interaction.reply({
        content: '❌ Error al cargar la lista de usuarios.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
