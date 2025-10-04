import logger from "../../core/lib/logger";
import { 
  ButtonInteraction, 
  MessageFlags, 
  PermissionFlagsBits
} from 'discord.js';
import { prisma } from '../../core/database/prisma';
import { ComponentType, TextInputStyle } from 'discord-api-types/v10';

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
      // Obtener estadísticas para filtrar usuarios disponibles
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

      // Crear modal usando la estructura de example.ts.txt (sin Builders)
      const modal = {
        title: 'Gestionar Puntos de Alianza',
        customId: 'ld_points_modal',
        components: [
          {
            type: ComponentType.TextDisplay,
            content: 'Selecciona un usuario del leaderboard y modifica sus puntos.'
          },
          {
            type: ComponentType.Label,
            label: 'Modificar Puntos Totales',
            component: {
              type: ComponentType.TextInput,
              customId: 'points_input',
              style: TextInputStyle.Short,
              required: true,
              placeholder: '+50 (añadir) / -20 (quitar) / =100 (establecer)',
              minLength: 1,
              maxLength: 10
            },
          },
          {
            type: ComponentType.Label,
            label: 'Selecciona el usuario del leaderboard',
            component: {
              type: ComponentType.UserSelect,
              customId: 'user_select',
              required: true,
              minValues: 1,
              maxValues: 1,
              placeholder: 'Elige un usuario del leaderboard...',
              // Filtrar solo usuarios que están en el leaderboard
              defaultUsers: stats.map(s => s.userId)
            },
          },
        ],
      } as const;

      await interaction.showModal(modal);

    } catch (e) {
        //@ts-ignore
      logger.error('Error en ldManagePoints:', e);
      await interaction.reply({
        content: '❌ Error al abrir el modal de gestión.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
