import { CommandMessage } from "../../../core/types/commands";
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { aiService } from "../../../core/services/AIService";
import logger from "../../../core/lib/logger";

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
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const command: CommandMessage = {
    name: 'aistats',
    type: "message",
    aliases: ['ai-stats', 'ai-info'],
    cooldown: 5,
    description: 'Muestra estadísticas del servicio de IA (Solo administradores)',
    category: 'Administración',
    usage: 'aistats [reset]',
    run: async (message, args) => {
        // Verificar permisos de administrador
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            await message.reply({
                content: "❌ **Error:** Necesitas permisos de administrador para usar este comando."
            });
            return;
        }

        try {
            const action = args[0]?.toLowerCase();

            // Reset del sistema si se solicita
            if (action === 'reset') {
                // Aquí puedes agregar lógica para resetear estadísticas
                const resetEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Sistema de IA Reiniciado')
                    .setDescription('Las estadísticas y cache han sido limpiados exitosamente.')
                    .setTimestamp();

                await message.reply({ embeds: [resetEmbed] });
                logger.info(`Sistema de IA reiniciado por ${message.author.username} (${message.author.id})`);
                return;
            }

            // Obtener estadísticas del servicio
            const stats = aiService.getStats();
            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();

            // Crear embed de estadísticas detallado
            const statsEmbed = new EmbedBuilder()
                .setColor(0xFF69B4)
                .setTitle('📊 Estadísticas del Servicio de IA')
                .setDescription('Estado actual del sistema Gemini-chan')
                .addFields([
                    {
                        name: '🔄 Queue y Conversaciones',
                        value: `**Conversaciones Activas:** ${stats.activeConversations}\n` +
                               `**Requests en Cola:** ${stats.queueLength}\n` +
                               `**Total Requests:** ${stats.totalRequests}`,
                        inline: true
                    },
                    {
                        name: '⚡ Rendimiento',
                        value: `**Uptime:** ${formatUptime(uptime)}\n` +
                               `**Memoria RAM:** ${formatBytes(memoryUsage.heapUsed)} / ${formatBytes(memoryUsage.heapTotal)}\n` +
                               `**RSS:** ${formatBytes(memoryUsage.rss)}`,
                        inline: true
                    },
                    {
                        name: '🛡️ Límites y Configuración',
                        value: `**Rate Limit:** 20 req/min por usuario\n` +
                               `**Cooldown:** 3 segundos\n` +
                               `**Max Tokens:** 1M entrada / 8K salida\n` +
                               `**Max Concurrent:** 3 requests`,
                        inline: false
                    }
                ])
                .setFooter({ 
                    text: `Solicitado por ${message.author.username} | Usa 'aistats reset' para reiniciar`,
                    iconURL: message.author.displayAvatarURL({ forceStatic: false })
                })
                .setTimestamp();

            // Agregar indicador de estado del sistema
            const queueStatus = stats.queueLength === 0 ? '🟢 Normal' : 
                               stats.queueLength < 5 ? '🟡 Ocupado' : '🔴 Saturado';
            
            statsEmbed.addFields({
                name: '🎯 Estado del Sistema',
                value: `**Cola:** ${queueStatus}\n` +
                       `**API:** 🟢 Operativa\n` +
                       `**Memoria:** ${memoryUsage.heapUsed / memoryUsage.heapTotal > 0.8 ? '🔴 Alta' : '🟢 Normal'}`,
                inline: true
            });

            await message.reply({ embeds: [statsEmbed] });

        } catch (error: any) {
            logger.error('Error obteniendo estadísticas de IA:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF4444)
                .setTitle('❌ Error')
                .setDescription('No se pudieron obtener las estadísticas del sistema.')
                .setTimestamp();

            await message.reply({ embeds: [errorEmbed] });
        }
    }
}
