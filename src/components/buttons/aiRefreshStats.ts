import logger from "../../core/lib/logger";
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { buildAIAdminPanel } from '../../commands/messages/AI/stats';

const OWNER_ID = '327207082203938818'; // Solo el dueño puede usar este panel

export default {
  customId: 'ai_refresh_stats',
  run: async (interaction: ButtonInteraction) => {
    // Verificar que sea el dueño del bot (CRÍTICO)
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: '❌ Solo el dueño del bot puede usar este panel administrativo.',
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await interaction.deferUpdate();
      
      // Reconstruir panel principal con datos actualizados
      const refreshedPanel = buildAIAdminPanel();

      await interaction.message.edit({
        // @ts-ignore - Flag de componentes V2
        flags: 32768,
        components: [refreshedPanel]
      });

      logger.info(`Estadísticas de IA refrescadas por el dueño ${interaction.user.username} (${interaction.user.id})`);

    } catch (error) {
      logger.error({ err: error }, 'Error refrescando estadísticas de IA');
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ 
          content: '❌ Error refrescando las estadísticas del sistema de IA.',  
          flags: MessageFlags.Ephemeral 
        });
      }
    }
  }
};
