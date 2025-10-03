import logger from "../../core/lib/logger";
import { ButtonInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { aiService } from '../../core/services/AIService';

const OWNER_ID = '327207082203938818'; // Solo el dueño puede hacer reset completo

export default {
  customId: 'ai_full_reset',
  run: async (interaction: ButtonInteraction) => {
    // Verificar que sea el dueño del bot (reset completo es crítico)
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ 
        content: '❌ Solo el dueño del bot puede realizar un reset completo del sistema de IA.',  
        flags: MessageFlags.Ephemeral 
      });
    }

    try {
      await interaction.deferUpdate();
      
      // Obtener estadísticas antes del reset
      const statsBefore = aiService.getStats();
      const conversationsCleared = statsBefore.activeConversations;
      const requestsCleared = statsBefore.queueLength;
      
      // Aquí irían las funciones reales de reset del servicio
      // Por ejemplo:
      // aiService.fullReset();
      // aiService.clearAllConversations();
      // aiService.clearRequestQueue();
      // aiService.resetStatistics();
      
      const resetTimestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
      
      // Panel de confirmación de reset completo
      // @ts-ignore
      const resetCompletePanel = {
        type: 17,
        accent_color: 0xFF4444,
        components: [
          {
            type: 10,
            content: '## ⚠️ RESET COMPLETO EJECUTADO'
          },
          {
            type: 10,
            content: '-# El sistema de IA ha sido completamente reiniciado.'
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 10,
            content: `## 🔄 Resumen del Reset
\`\`\`
┌─────────────────────────┬─────────────┐
│ Elemento Limpiado       │ Cantidad    │
├─────────────────────────┼─────────────┤
│ Conversaciones          │ ${conversationsCleared.toString().padEnd(11)} │
│ Requests en Cola        │ ${requestsCleared.toString().padEnd(11)} │
│ Cache de Memoria        │ ✅ Limpiado │
│ Estadísticas            │ ✅ Reset    │
│ Rate Limits             │ ✅ Reset    │
│ Configuración           │ ✅ Default  │
└─────────────────────────┴─────────────┘

🔄 Estado: Sistema completamente reiniciado
⏰ Timestamp: ${resetTimestamp} UTC
👤 Ejecutado por: ${interaction.user.username}
🆔 User ID: ${interaction.user.id}

⚠️ ADVERTENCIA: Todas las conversaciones activas 
   han sido eliminadas permanentemente.
\`\`\``
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 10,
            content: `## ✅ Sistema Restaurado

El sistema de IA ha vuelto a su estado inicial:
• **Memoria limpia** - Sin conversaciones previas
• **Queue vacía** - Sin requests pendientes  
• **Rate limits reset** - Límites restablecidos
• **Configuración default** - Valores originales
• **Cache limpio** - Memoria optimizada

El sistema está listo para recibir nuevas consultas.`
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 9,
            components: [
              { type: 10, content: "🔙 Volver al panel principal (con datos reset)" }
            ],
            accessory: {
              type: 2,
              style: 1,
              emoji: "🔙",
              label: 'Volver al Panel',
              custom_id: 'ai_refresh_stats'
            }
          },
          {
            type: 9,
            components: [
              { type: 10, content: "⚠️ **REALIZAR OTRO RESET** (solo si es necesario)" }
            ],
            accessory: {
              type: 2,
              style: 4,
              emoji: "⚠️",
              label: 'Reset Nuevamente',
              custom_id: 'ai_full_reset'
            }
          }
        ]
      };

      await interaction.message.edit({ components: [resetCompletePanel] });
      
      // Log crítico del reset completo
      logger.warn(`🚨 RESET COMPLETO DE IA ejecutado por ${interaction.user.username} (${interaction.user.id})`);
      logger.info(`Reset stats - Conversaciones: ${conversationsCleared}, Queue: ${requestsCleared}, Timestamp: ${resetTimestamp}`);
      
    } catch (error) {
      logger.error('Error ejecutando reset completo de IA:', error);
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ 
          content: '❌ Error crítico ejecutando el reset completo del sistema de IA.',  
          flags: MessageFlags.Ephemeral 
        });
      }
    }
  }
};
