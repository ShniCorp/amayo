import logger from "../../core/lib/logger";
import { ButtonInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';

/**
 * Formatear tiempo de actividad
 */
function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

/**
 * Formatear bytes a formato legible
 */
function formatBytesMB(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

/**
 * Construir panel de administración de IA actualizado
 */
function buildRefreshedAIPanel() {
    const { aiService } = require('../../core/services/AIService');
    const stats = aiService.getStats();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const now = new Date();
    const ts = now.toISOString().replace('T', ' ').split('.')[0];
    
    // Estados del sistema
    const queueStatus = stats.queueLength === 0 ? '🟢 Normal' : 
                       stats.queueLength < 5 ? '🟡 Ocupado' : '🔴 Saturado';
    const memoryStatus = memoryUsage.heapUsed / memoryUsage.heapTotal > 0.8 ? '🔴 Alta' : '🟢 Normal';
    
    const rss = formatBytesMB(memoryUsage.rss);
    const heapUsed = formatBytesMB(memoryUsage.heapUsed);
    const heapTotal = formatBytesMB(memoryUsage.heapTotal);
    const external = formatBytesMB(memoryUsage.external);

    // @ts-ignore
    return {
        type: 17,
        accent_color: 0xFF69B4,
        components: [
            {
                type: 10,
                content: '## 🌸 Panel de Administración - Gemini-chan (Actualizado)'
            },
            {
                type: 10,
                content: '-# Estadísticas refrescadas automáticamente.'
            },
            { type: 14, divider: true, spacing: 1 },
            {
                type: 9,
                components: [
                    { type: 10, content: `🔄 **Conversaciones Activas:** ${stats.activeConversations}` }
                ],
                accessory: {
                    type: 2,
                    style: 1,
                    emoji: "🧹",
                    label: 'Limpiar Cache',
                    custom_id: 'ai_clear_cache'
                }
            },
            {
                type: 9,
                components: [
                    { type: 10, content: `📊 **Requests en Cola:** ${stats.queueLength} | **Estado:** ${queueStatus}` }
                ],
                accessory: {
                    type: 2,
                    style: 1,
                    emoji: "🔄",
                    label: 'Refrescar Stats',
                    custom_id: 'ai_refresh_stats'
                }
            },
            {
                type: 9,
                components: [
                    { type: 10, content: `⏱️ **Total Requests:** ${stats.totalRequests} | **Uptime:** ${formatUptime(uptime)}` }
                ],
                accessory: {
                    type: 2,
                    style: 2,
                    emoji: "🔧",
                    label: 'Configuración',
                    custom_id: 'ai_config'
                }
            },
            { type: 14, divider: true, spacing: 1 },
            {
                type: 10,
                content: ` ## 🧠 Uso de Memoria del Sistema IA
\`\`\`
┌─────────────────┬──────────────┬──────────┐
│ Memory Type     │ Usage        │ Status   │
├─────────────────┼──────────────┼──────────┤
│ RSS             │ ${rss.padEnd(12)} │ Normal   │
│ Heap Used       │ ${heapUsed.padEnd(12)} │ ${memoryStatus.padEnd(8)} │
│ Heap Total      │ ${heapTotal.padEnd(12)} │ Normal   │
│ External        │ ${external.padEnd(12)} │ Normal   │
└─────────────────┴──────────────┴──────────┘

📈 Configuración Actual:
• Rate Limit: 20 req/min por usuario
• Cooldown: 3 segundos entre requests
• Max Tokens: 1M entrada / 8K salida
• Max Concurrent: 3 requests simultáneos
• Modelo: gemini-1.5-flash
\`\`\`
🔄 Última actualización: ${ts} UTC

⚠️ **Nota:** El sistema se resetea automáticamente cada 30 minutos para optimizar memoria.`
            },
            { type: 14, divider: true, spacing: 1 },
            {
                type: 9,
                components: [
                    { type: 10, content: "<:Sup_urg:1420535068056748042> **REINICIAR** todo el sistema de IA (limpia cache, conversaciones y estadísticas)" }
                ],
                accessory: {
                    type: 2,
                    style: 4,
                    emoji: "⚠️",
                    label: 'RESET COMPLETO',
                    custom_id: 'ai_full_reset'
                }
            }
        ]
    };
}

export default {
  customId: 'ai_refresh_stats',
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
      
      // Refrescar y reconstruir el panel con datos actualizados
      const refreshedPanel = buildRefreshedAIPanel();
      
      await interaction.message.edit({ components: [refreshedPanel] });
      logger.info(`Estadísticas de IA refrescadas por ${interaction.user.username} (${interaction.user.id})`);
      
    } catch (error)
        //@ts-ignore
      logger.error('Error refrescando estadísticas de IA:', error);
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ 
          content: '❌ Error refrescando las estadísticas del sistema de IA.',  
          flags: MessageFlags.Ephemeral 
        });
      }
    }
  }
};
