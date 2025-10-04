import logger from "../../../core/lib/logger";
import { CommandMessage } from "../../../core/types/commands";
import { TextChannel, DMChannel, ThreadChannel, EmbedBuilder, ChannelType } from "discord.js";
import { aiService } from "../../../core/services/AIService";

/**
 * Dividir texto de forma inteligente preservando markdown
 */
function smartChunkText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    let currentChunk = '';
    const lines = text.split('\n');

    for (const line of lines) {
        // Si agregar esta línea excede el límite
        if (currentChunk.length + line.length + 1 > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }

            // Si la línea misma es muy larga, dividirla por palabras
            if (line.length > maxLength) {
                const words = line.split(' ');
                let wordChunk = '';

                for (const word of words) {
                    if (wordChunk.length + word.length + 1 > maxLength) {
                        if (wordChunk) {
                            chunks.push(wordChunk.trim());
                            wordChunk = '';
                        }
                    }
                    wordChunk += (wordChunk ? ' ' : '') + word;
                }

                if (wordChunk) {
                    currentChunk = wordChunk;
                }
            } else {
                currentChunk = line;
            }
        } else {
            currentChunk += (currentChunk ? '\n' : '') + line;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

function buildMessageMeta(message: any): string {
    try {
        const parts: string[] = [];
        const inGuild = !!message.guild;

        // Canal / hilo
        if (message.channel) {
            if (message.channel.type === ChannelType.GuildText) {
                parts.push(`Canal: #${message.channel.name}`);
            } else if (message.channel.isThread?.()) {
                const parent = message.channel.parent as TextChannel | null;
                const threadName = message.channel.name;
                const parentName = parent?.name ? ` en #${parent.name}` : '';
                parts.push(`Hilo: ${threadName}${parentName}`);
            } else if (message.channel.type === ChannelType.DM) {
                parts.push('DM');
            }
        }

        // Menciones
        const userMentions = message.mentions?.users ? Array.from(message.mentions.users.values()) : [];
        const roleMentions = message.mentions?.roles ? Array.from(message.mentions.roles.values()) : [];
        const channelMentions = message.mentions?.channels ? Array.from(message.mentions.channels.values()) : [];

        if (userMentions.length) {
            parts.push(`Menciones usuario: ${userMentions.slice(0, 5).map((u: any) => u.username ?? u.tag ?? u.id).join(', ')}`);
        }
        if (roleMentions.length) {
            parts.push(`Menciones rol: ${roleMentions.slice(0, 5).map((r: any) => r.name ?? r.id).join(', ')}`);
        }
        if (channelMentions.length) {
            parts.push(`Menciones canal: ${channelMentions.slice(0, 3).map((c: any) => c.name ?? c.id).join(', ')}`);
        }

        // ¿Mención al bot?
        const botId = message.client?.user?.id;
        if (botId && message.mentions?.users?.has?.(botId)) {
            parts.push('El mensaje menciona al bot');
        }

        // Respuesta/Referencia
        if (message.reference?.messageId) {
            parts.push('Es una respuesta a otro mensaje');
        }

        // Adjuntos
        const attachments = message.attachments ? Array.from(message.attachments.values()) : [];
        if (attachments.length) {
            const info = attachments.slice(0, 2).map((a: any) => a.name || a.contentType || 'adjunto').join(', ');
            parts.push(`Adjuntos: ${info}`);
        }

        const metaRaw = parts.join(' | ');
        return metaRaw.length > 800 ? metaRaw.slice(0, 800) : metaRaw;
    } catch {
        return '';
    }
}

export const command: CommandMessage = {
    name: 'ai',
    type: "message",
    aliases: ['chat', 'gemini'],
    cooldown: 2, // Reducido porque el servicio maneja su propio rate limiting
    description: 'Chatea con la IA (Gemini) de forma estable y escalable.',
    category: 'IA',
    usage: 'ai <mensaje>',
    run: async (message, args) => {
        // Validaciones básicas
        if (!args || args.length === 0) {
            const helpEmbed = new EmbedBuilder()
                .setColor(0xFF69B4)
                .setTitle('❌ Error: Mensaje requerido')
                .setDescription(
                    '**Uso:** `ai <tu mensaje>`\n' +
                    '**Ejemplo:** `ai ¿Cómo funciona JavaScript?`\n' +
                    '**Límite:** 4000 caracteres máximo'
                )
                .setFooter({ text: 'AI Chat mejorado con Gemini 2.5 Flash' });

            await message.reply({ embeds: [helpEmbed] });
            return;
        }

        const prompt = args.join(' ');
        const userId = message.author.id;
        const guildId = message.guild?.id;

        // Verificar tipo de canal
        const channel = message.channel as TextChannel | DMChannel | ThreadChannel;
        if (!channel || !('send' in channel)) {
            await message.reply({
                content: "❌ **Error:** Este comando no se puede usar en este tipo de canal."
            });
            return;
        }

        // Construir metadatos del mensaje para mejor contexto
        const meta = buildMessageMeta(message);

        // Indicador de escritura mejorado
        const typingInterval = setInterval(() => {
            channel.sendTyping().catch(() => {});
        }, 5000);

        try {
            // Usar el servicio mejorado con manejo de prioridad
            const priority = message.member?.permissions.has('Administrator') ? 'high' : 'normal';

            const aiResponse = await aiService.processAIRequest(
                userId,
                prompt,
                guildId,
                priority,
                { meta }
            );

            // Crear embed de respuesta mejorado
            const embed = new EmbedBuilder()
                .setColor(0xFF69B4)
                .setTitle('🌸 Gemini-chan')
                .setDescription(aiResponse)
                .setFooter({
                    text: `Solicitado por ${message.author.username}`,
                    icon_url: message.author.displayAvatarURL({ forceStatic: false })
                })
                .setTimestamp();

            // Manejar respuestas largas de forma inteligente
            if (aiResponse.length > 4000) {
                // Dividir en chunks preservando markdown
                const chunks = smartChunkText(aiResponse, 4000);

                for (let i = 0; i < chunks.length && i < 3; i++) {
                    const chunkEmbed = new EmbedBuilder()
                        .setColor(0xFF69B4)
                        .setTitle(i === 0 ? '🌸 Gemini-chan' : `🌸 Gemini-chan (${i + 1}/${chunks.length})`)
                        .setDescription(chunks[i])
                        .setFooter({
                            text: `Solicitado por ${message.author.username} | Parte ${i + 1}`,
                            icon_url: message.author.displayAvatarURL({ forceStatic: false })
                        })
                        .setTimestamp();

                    if (i === 0) {
                        await message.reply({ embeds: [chunkEmbed] });
                    } else {
                        await channel.send({ embeds: [chunkEmbed] });
                        // Pausa entre mensajes para evitar rate limits
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                if (chunks.length > 3) {
                    await channel.send({
                        content: "⚠️ **Nota:** La respuesta fue truncada. Intenta preguntas más específicas."
                    });
                }
            } else {
                await message.reply({ embeds: [embed] });
            }

            // Log para monitoreo (solo en desarrollo)
            if (process.env.NODE_ENV === 'development') {
                const stats = aiService.getStats();
                logger.info(`AI Request completado - Usuario: ${userId}, Queue: ${stats.queueLength}, Conversaciones activas: ${stats.activeConversations}`);
            }

        } catch (error: any) {
            logger.error(`Error en comando AI para usuario ${userId}:`, error);

            // Crear embed de error informativo
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF4444)
                .setTitle('❌ Error del Servicio de IA')
                .setDescription(error.message || 'Error desconocido del servicio')
                .addFields({
                    name: '💡 Consejos',
                    value: '• Verifica que tu mensaje no sea demasiado largo\n' +
                           '• Espera unos segundos entre consultas\n' +
                           '• Evita contenido inapropiado'
                })
                .setFooter({ text: 'Si el problema persiste, contacta a un administrador' })
                .setTimestamp();

            await message.reply({ embeds: [errorEmbed] });
        } finally {
            // Limpiar indicador de escritura
            clearInterval(typingInterval);
        }
    }
}