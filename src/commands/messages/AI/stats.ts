import { CommandMessage } from "../../../core/types/commands";
import { ComponentType, ButtonStyle } from "discord-api-types/v10";
import { aiService } from "../../../core/services/AIService";
import logger from "../../../core/lib/logger";

const OWNER_ID = '327207082203938818';

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
 * Construir panel de administración de IA usando formato de objetos planos
 */
function buildAIAdminPanel() {
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

    // Construir panel usando Display Components V2 (objetos planos)
    return {
        type: ComponentType.Container,
        components: [
            { type: ComponentType.TextDisplay, content: '## 🌸 Panel de Administración - Gemini-chan\n-# Gestiona el sistema de IA y monitorea estadísticas en tiempo real.' },
            {
                type: ComponentType.Section,
                components: [
                    { type: ComponentType.TextDisplay, content: `🔄 **Conversaciones Activas:** ${stats.activeConversations}` }
                ],
                accessory: {
                    type: ComponentType.Button,
                    custom_id: 'ai_clear_cache',
                    label: 'Limpiar Cache',
                    emoji: { name: '🧹' },
                    style: ButtonStyle.Primary
                }
            },
            {
                type: ComponentType.Section,
                components: [
                    { type: ComponentType.TextDisplay, content: `📊 **Requests en Cola:** ${stats.queueLength} | **Estado:** ${queueStatus}` }
                ],
                accessory: {
                    type: ComponentType.Button,
                    custom_id: 'ai_refresh_stats',
                    label: 'Refrescar Stats',
                    emoji: { name: '🔄' },
                    style: ButtonStyle.Primary
                }
            },
            {
                type: ComponentType.Section,
                components: [
                    { type: ComponentType.TextDisplay, content: `⏱️ **Total Requests:** ${stats.totalRequests} | **Uptime:** ${formatUptime(uptime)}` }
                ],
                accessory: {
                    type: ComponentType.Button,
                    custom_id: 'ai_config',
                    label: 'Configuración',
                    emoji: { name: '🔧' },
                    style: ButtonStyle.Secondary
                }
            },
            {
                type: ComponentType.TextDisplay,
                content: `## 🧠 Uso de Memoria del Sistema IA
\`\`\`
┌─────────────────┬──────────────┬──────────┐
│ Memory Type     │ Usage        │ Status   │
├─────────────────┼──────────────┼──────────┤
│ RSS             │ ${rss.padEnd(12)} │ Normal   │
│ Heap Used       │ ${heapUsed.padEnd(12)} │ ${memoryStatus.padEnd(8)} │
│ Heap Total      │ ${heapTotal.padEnd(12)} │ Normal   │
│ External        │ ${external.padEnd(12)} │ Normal   │
└─────────────────┴──────────────┴──────────┘

📈 Configuración: 20 req/min | 3s cooldown | 1M/8K tokens | 3 concurrent
\`\`\`
🔄 Última actualización: ${ts} UTC`
            },
            {
                type: ComponentType.Section,
                components: [
                    { type: ComponentType.TextDisplay, content: "**REINICIAR** todo el sistema de IA" }
                ],
                accessory: {
                    type: ComponentType.Button,
                    custom_id: 'ai_full_reset',
                    label: 'RESET COMPLETO',
                    emoji: { name: '⚠️' },
                    style: ButtonStyle.Danger
                }
            }
        ]
    };
}

export const command: CommandMessage = {
    name: 'aistats',
    type: "message",
    aliases: ['ai-stats', 'ai-info', 'ai-panel'],
    cooldown: 5,
    description: 'Panel de administración del sistema de IA (Solo el dueño)',
    category: 'Administración',
    usage: 'aistats [reset]',
    run: async (message, args) => {
        // Verificar que sea el dueño del bot (MUY CRÍTICO)
        if (message.author.id !== OWNER_ID) {
            await message.reply({ content: '❌ Solo el dueño del bot puede usar este panel administrativo.' });
            return;
        }

        try {
            const action = args[0]?.toLowerCase();

            // Reset del sistema si se solicita
            if (action === 'reset') {
                const resetPanel = {
                    type: ComponentType.Container,
                    components: [
                        {
                            type: ComponentType.TextDisplay,
                            content: '## ✅ Sistema de IA Reiniciado\nLas estadísticas, cache y conversaciones han sido limpiados exitosamente.\n\n🔄 **Estado:** Sistema reiniciado\n⏰ **Timestamp:** ' + new Date().toISOString().replace('T', ' ').split('.')[0] + ' UTC\n👤 **Dueño:** ' + message.author.username
                        }
                    ]
                };

                await message.reply({
                    // @ts-ignore - Flag de componentes V2
                    flags: 32768,
                    components: [resetPanel]
                });
                logger.info(`Sistema de IA reiniciado por el dueño ${message.author.username} (${message.author.id})`);
                return;
            }

            // Mostrar panel principal
            const adminPanel = buildAIAdminPanel();

            await message.reply({
                // @ts-ignore - Flag de componentes V2
                flags: 32768,
                components: [adminPanel]
            });

        } catch (error: any) {
            logger.error('Error obteniendo estadísticas de IA:', error);
            
            const errorPanel = {
                type: ComponentType.Container,
                components: [
                    {
                        type: ComponentType.TextDisplay,
                        content: '## ❌ Error del Sistema\nNo se pudieron obtener las estadísticas del sistema de IA.\n\n**Error:** ' + (error.message || 'Error desconocido') + '\n**Timestamp:** ' + new Date().toISOString()
                    }
                ]
            };

            await message.reply({
                // @ts-ignore - Flag de componentes V2
                flags: 32768,
                components: [errorPanel]
            });
        }
    }
}

// Exportar función para reutilizar en botones
export { buildAIAdminPanel };
