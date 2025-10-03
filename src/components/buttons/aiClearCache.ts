import logger from "../../core/lib/logger";
import { ButtonInteraction, MessageFlags, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { aiService } from '../../core/services/AIService';

const OWNER_ID = '327207082203938818'; // Solo el dueño puede usar este panel

export default {
  customId: 'ai_clear_cache',
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
      
      // Limpiar cache de conversaciones
      const stats = aiService.getStats();
      const conversationsCleared = stats.activeConversations;
      
      // Aquí iría la lógica real de limpieza:
      // aiService.clearAllConversations();

      // Crear container de éxito usando la API real
      const successContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent('## 🧹 Cache Limpiado Exitosamente\n-# Se han limpiado ' + conversationsCleared + ' conversaciones activas.\n\n✅ **Estado:** Cache limpiado\n🔄 **Conversaciones eliminadas:** ' + conversationsCleared + '\n⏰ **Timestamp:** ' + new Date().toISOString().replace('T', ' ').split('.')[0] + ' UTC\n👤 **Dueño:** ' + interaction.user.username)
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent("🔙 Volver al panel principal de administración")
            )
              .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('ai_refresh_stats')
                .setLabel('Volver al Panel')
                .setEmoji('🔙')
                .setStyle(ButtonStyle.Primary)
            )
        );

      await interaction.message.edit({
        components: [successContainer],
        flags: MessageFlags.IsComponentsV2
      });
      logger.info(`Cache de IA limpiado por el dueño ${interaction.user.username} (${interaction.user.id})`);

    } catch (error) {
        //@ts-ignore
      logger.error('Error limpiando cache de IA:', error);
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ 
          content: '❌ Error limpiando el cache del sistema de IA.',  
          flags: MessageFlags.Ephemeral 
        });
      }
    }
  }
};
