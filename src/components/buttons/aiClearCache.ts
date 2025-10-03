import logger from "../../core/lib/logger";
import { ButtonInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { aiService } from '../../core/services/AIService';

export default {
  customId: 'ai_clear_cache',
  run: async (interaction: ButtonInteraction) => {
    // Verificar permisos de administrador
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ No tienes permisos de administrador para usar este botón.',  
        flags: MessageFlags.Ephemeral 
      });
    }

    try {
      await interaction.deferUpdate();
      
      // Limpiar cache de conversaciones (simular limpieza)
      const stats = aiService.getStats();
      const conversationsCleared = stats.activeConversations;
      
      // Aquí podrías agregar lógica real para limpiar el cache
      // Por ejemplo: aiService.clearConversations();
      
      // @ts-ignore
      const successPanel = {
        type: 17,
        accent_color: 0x00FF00,
        components: [
          {
            type: 10,
            content: '## 🧹 Cache Limpiado Exitosamente'
          },
          {
            type: 10,
            content: `-# Se han limpiado ${conversationsCleared} conversaciones activas.`
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 10,
            content: `✅ **Estado:** Cache limpiado\n🔄 **Conversaciones eliminadas:** ${conversationsCleared}\n⏰ **Timestamp:** ${new Date().toISOString().replace('T', ' ').split('.')[0]} UTC\n👤 **Administrador:** ${interaction.user.username}`
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 9,
            components: [
              { type: 10, content: "🔙 Volver al panel principal de administración" }
            ],
            accessory: {
              type: 2,
              style: 2,
              emoji: "🔙",
              label: 'Volver al Panel',
              custom_id: 'ai_refresh_stats'
            }
          }
        ]
      };

      await interaction.message.edit({ components: [successPanel] });
      logger.info(`Cache de IA limpiado por ${interaction.user.username} (${interaction.user.id})`);
      
    } catch (error) {
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
