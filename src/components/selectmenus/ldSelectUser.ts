import logger from "../../core/lib/logger";
import { 
  StringSelectMenuInteraction, 
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js';

export default {
  customId: 'ld_select_user',
  run: async (interaction: StringSelectMenuInteraction) => {
    if (!interaction.guild) {
      return interaction.reply({ 
        content: '❌ Solo disponible en servidores.', 
        flags: MessageFlags.Ephemeral 
      });
    }

    try {
      const selectedUserId = interaction.values[0];
      
      // Obtener información del usuario seleccionado para mostrar en el modal
      let userName = 'Usuario';
      try {
        const member = await interaction.guild.members.fetch(selectedUserId);
        userName = member.displayName || member.user.username;
      } catch {
        try {
          const user = await interaction.client.users.fetch(selectedUserId);
          userName = user.username;
        } catch {
          userName = selectedUserId;
        }
      }

      // Crear modal para ingresar la cantidad de puntos
      const modal = new ModalBuilder()
        .setCustomId(`ld_points_modal:${selectedUserId}`)
        .setTitle(`Gestionar puntos de ${userName}`);

      // Input para puntos totales
      const totalInput = new TextInputBuilder()
        .setCustomId('total_points')
        .setLabel('Puntos Totales')
        .setPlaceholder('+50 (añadir) / -25 (quitar) / =100 (establecer)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      // Input para puntos semanales
      const weeklyInput = new TextInputBuilder()
        .setCustomId('weekly_points')
        .setLabel('Puntos Semanales')
        .setPlaceholder('+10 (añadir) / -5 (quitar) / =50 (establecer)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      // Input para puntos mensuales
      const monthlyInput = new TextInputBuilder()
        .setCustomId('monthly_points')
        .setLabel('Puntos Mensuales')
        .setPlaceholder('+20 (añadir) / -10 (quitar) / =75 (establecer)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      // Añadir los inputs al modal
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(totalInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(weeklyInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(monthlyInput)
      );

      await interaction.showModal(modal);
    } catch (e) {
      logger.error({ err: e }, 'Error en ldSelectUser');
      await interaction.reply({
        content: '❌ Error al procesar la selección.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
