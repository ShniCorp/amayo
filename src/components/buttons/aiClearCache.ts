import logger from "../../core/lib/logger";
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { ComponentType, ButtonStyle } from 'discord-api-types/v10';
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
      
      // Limpiar cache pero mantener memoria persistente
      const stats = aiService.getStats();
      const conversationsCleared = stats.activeConversations;
      
      // Usar el nuevo método que mantiene memoria persistente
      aiService.clearCache();

      // Crear panel de éxito usando objetos planos
      const successPanel = {
        type: ComponentType.Container,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: '## 🧹 Cache Limpiado Exitosamente\n-# Se han limpiado ' + conversationsCleared + ' conversaciones activas.\n\n✅ **Estado:** Cache limpiado\n🔄 **Conversaciones eliminadas:** ' + conversationsCleared + '\n⏰ **Timestamp:** ' + new Date().toISOString().replace('T', ' ').split('.')[0] + ' UTC\n👤 **Dueño:** ' + interaction.user.username
          },
          {
            type: ComponentType.Section,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: "🔙 Volver al panel principal de administración"
              }
            ],
            accessory: {
              type: ComponentType.Button,
              custom_id: 'ai_refresh_stats',
              label: 'Volver al Panel',
              emoji: { name: '🔙' },
              style: ButtonStyle.Primary
            }
          }
        ]
      };

      await interaction.message.edit({
        // @ts-ignore - Flag de componentes V2
        flags: 32768,
        components: [successPanel]
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
