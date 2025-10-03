import { CommandMessage } from "../../../core/types/commands";
import { ContainerBuilder, TextDisplayBuilder, SectionBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from "discord.js";
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
 * Construir panel de administración de IA usando la API REAL de Discord.js 14.22.1
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

    // Crear texto de header
    const headerText = new TextDisplayBuilder()
        .setContent('## 🌸 Panel de Administración - Gemini-chan\n-# Gestiona el sistema de IA y monitorea estadísticas en tiempo real.');

    // Crear secciones con estadísticas
    const statsSection1 = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`🔄 **Conversaciones Activas:** ${stats.activeConversations}`)
        )
        .setButtonAccessory(
            new ButtonBuilder()
                .setCustomId('ai_clear_cache')
                .setLabel('Limpiar Cache')
                .setEmoji('🧹')
                .setStyle(ButtonStyle.Primary)
        );

    const statsSection2 = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`📊 **Requests en Cola:** ${stats.queueLength} | **Estado:** ${queueStatus}`)
        )
        .setButtonAccessory(
            new ButtonBuilder()
                .setCustomId('ai_refresh_stats')
                .setLabel('Refrescar Stats')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Primary)
        );

    const configSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`⏱️ **Total Requests:** ${stats.totalRequests} | **Uptime:** ${formatUptime(uptime)}`)
        )
        .setButtonAccessory(
            new ButtonBuilder()
                .setCustomId('ai_config')
                .setLabel('Configuración')
                .setEmoji('🔧')
                .setStyle(ButtonStyle.Secondary)
        );

    // Texto de memoria
    const memoryText = new TextDisplayBuilder()
        .setContent(`## 🧠 Uso de Memoria del Sistema IA
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
🔄 Última actualización: ${ts} UTC`);

    // Sección de reset
    const resetSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent("**REINICIAR** todo el sistema de IA")
        )
        .setButtonAccessory(
            new ButtonBuilder()
                .setCustomId('ai_full_reset')
                .setLabel('RESET COMPLETO')
                .setEmoji('⚠️')
                .setStyle(ButtonStyle.Danger)
        );

    // Construir container principal
    const container = new ContainerBuilder()
        .addTextDisplayComponents(headerText)
        .addSectionComponents(statsSection1, statsSection2, configSection)
        .addTextDisplayComponents(memoryText)
        .addSectionComponents(resetSection);

    return container;
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
                const resetContainer = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent('## ✅ Sistema de IA Reiniciado\nLas estadísticas, cache y conversaciones han sido limpiados exitosamente.\n\n🔄 **Estado:** Sistema reiniciado\n⏰ **Timestamp:** ' + new Date().toISOString().replace('T', ' ').split('.')[0] + ' UTC\n👤 **Dueño:** ' + message.author.username)
                    );

                await message.reply({
                    components: [resetContainer],
                    flags: MessageFlags.IsComponentsV2
                });
                logger.info(`Sistema de IA reiniciado por el dueño ${message.author.username} (${message.author.id})`);
                return;
            }

            // Mostrar panel principal
            const adminPanel = buildAIAdminPanel();

            await message.reply({
                components: [adminPanel],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error: any) {
            logger.error('Error obteniendo estadísticas de IA:', error);
            
            const errorContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent('## ❌ Error del Sistema\nNo se pudieron obtener las estadísticas del sistema de IA.\n\n**Error:** ' + (error.message || 'Error desconocido') + '\n**Timestamp:** ' + new Date().toISOString())
                );

            await message.reply({
                components: [errorContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
}

// Exportar función para reutilizar en botones
export { buildAIAdminPanel };
