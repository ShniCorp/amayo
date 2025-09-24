import {ButtonInteraction, MessageFlags} from 'discord.js';
import { buildAdminPanel } from '../../commands/messages/net/commandsAdmin';

const OWNER_ID = '327207082203938818';

export default {
  customId: 'cmd_mem_refresh',
  run: async (interaction: ButtonInteraction) => {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ No autorizado.',  flags: MessageFlags.Ephemeral });
    }
    try {
      await interaction.deferUpdate();
      const panel = buildAdminPanel();
      // Edita el mensaje original reemplazando componentes (solo el contenedor con filas internas)
      await interaction.message.edit({ components: [panel] });
    } catch (e) {
      console.error('Error refrescando panel de memoria:', e);
      if (!interaction.deferred && !interaction.replied)
        await interaction.reply({ content: '❌ Error refrescando panel.',  flags: MessageFlags.Ephemeral });
    }
  }
};

