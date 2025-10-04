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

      // Input para puntos totales (simplificado)
      const totalInput = new TextInputBuilder()
        .setCustomId('total_points')
        .setLabel('Modificar Puntos Totales')
        .setPlaceholder('+50 (añadir) / -2 (quitar últimos 2) / =100 (establecer)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      // Añadir el input al modal
      // @ts-ignore
      modal.addComponents(
        // @ts-ignore
        new ActionRowBuilder().addComponents(totalInput)
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
