import logger from "../../../core/lib/logger";
import { CommandMessage } from "../../../core/types/commands";
import { TextChannel, DMChannel, ThreadChannel, ChannelType, GuildEmoji } from "discord.js";
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

function replaceShortcodesWithEmojisOutsideCode(text: string, emojiMap: Record<string, string>): string {
    if (!text) return text;
    // Split by triple backticks to avoid code blocks
    const parts = text.split(/```/);
    for (let i = 0; i < parts.length; i++) {
        // Only replace in non-code blocks (even indices)
        if (i % 2 === 0) {
            // Also avoid inline code wrapped in single backticks by a simple pass
            const inlineParts = parts[i].split(/`/);
            for (let j = 0; j < inlineParts.length; j++) {
                if (j % 2 === 0) {
                    inlineParts[j] = inlineParts[j].replace(/:([a-zA-Z0-9_]{2,32}):/g, (match, p1: string) => {
                        const key = p1;
                        const found = emojiMap[key];
                        return found ? found : match;
                    });
                }
            }
            parts[i] = inlineParts.join('`');
        }
    }
    return parts.join('```');
}

async function getGuildCustomEmojis(message: any): Promise<{ names: string[]; map: Record<string, string> }> {
    const result = { names: [] as string[], map: {} as Record<string, string> };
    try {
        const guild = message.guild;
        if (!guild) return result;
        // Ensure emojis are fetched
        const emojis = await guild.emojis.fetch();
        const list = Array.from(emojis.values()) as GuildEmoji[];
        for (const e of list) {
            const name = e.name ?? undefined;
            const id = e.id;
            if (!name || !id) continue;
            const tag = e.animated ? `<a:${name}:${id}>` : `<:${name}:${id}>`;
            if (!(name in result.map)) {
                result.map[name] = tag;
                result.names.push(name);
            }
        }
        // Limit names to 25 for meta context brevity
        result.names = result.names.slice(0, 25);
    } catch {
        // ignore
    }
    return result;
}

function buildMessageMeta(message: any, emojiNames?: string[]): string {
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

        if (emojiNames && emojiNames.length) {
            parts.push(`Emojis personalizados disponibles (usa :nombre:): ${emojiNames.join(', ')}`);
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
            await message.reply({
                content: '**Uso:** `ai <tu mensaje>`\n**Ejemplo:** `ai ¿Cómo funciona JavaScript?`\n**Límite:** 4000 caracteres máximo'
            });
            return;
        }

        const prompt = args.join(' ');
        const userId = message.author.id;
        const guildId = message.guild?.id;

        // Verificar tipo de canal
        const channel = message.channel as TextChannel | DMChannel | ThreadChannel;
        if (!channel || !('send' in channel)) {
            await message.reply({ content: "❌ **Error:** Este comando no se puede usar en este tipo de canal." });
            return;
        }

        // Indicador de que está escribiendo
        const typingInterval = setInterval(() => {
            channel.sendTyping().catch(() => {});
        }, 5000);

        // Emojis personalizados del servidor
        const { names: emojiNames, map: emojiMap } = await getGuildCustomEmojis(message);

        // Construir metadatos del mensaje para mejor contexto (incluye emojis)
        const messageMeta = buildMessageMeta(message, emojiNames);

        // Verificar si es una respuesta a un mensaje de la AI
        let referencedMessageId: string | undefined;
        let isReplyToAI = false;

        if (message.reference?.messageId) {
            try {
                const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);
                if (referencedMessage.author.id === message.client.user?.id) {
                    isReplyToAI = true;
                    referencedMessageId = message.reference.messageId;
                }
            } catch (error) {
                // Mensaje referenciado no encontrado, ignorar
            }
        }

        try {
            let aiResponse: string;

            // Verificar si hay imágenes adjuntas
            const attachments = Array.from(message.attachments.values());
            const hasImages = attachments.length > 0 && aiService.hasImageAttachments(attachments);

            // Usar el método unificado con memoria persistente y soporte para imágenes
            aiResponse = await aiService.processAIRequestWithMemory(
                userId,
                prompt,
                guildId,
                message.channel.id,
                message.id,
                referencedMessageId,
                message.client,
                'normal',
                {
                    meta: messageMeta + (hasImages ? ` | Tiene ${attachments.length} imagen(es) adjunta(s)` : ''),
                    attachments: hasImages ? attachments : undefined
                }
            );

            // Reemplazar :nombre: por el tag real del emoji, evitando bloques de código
            if (emojiNames.length > 0) {
                aiResponse = replaceShortcodesWithEmojisOutsideCode(aiResponse, emojiMap);
            }

            // Discord limita el contenido a ~2000 caracteres
            const MAX_CONTENT = 2000;
            if (aiResponse.length > MAX_CONTENT) {
                const chunks = smartChunkText(aiResponse, MAX_CONTENT);

                for (let i = 0; i < chunks.length && i < 6; i++) {
                    if (i === 0) {
                        await message.reply({ content: chunks[i] });
                    } else {
                        await channel.send({ content: chunks[i] });
                        // Pausa entre mensajes para evitar rate limits
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }

                if (chunks.length > 6) {
                    await channel.send({ content: "⚠️ Nota: La respuesta fue truncada. Intenta una pregunta más específica." });
                }
            } else {
                await message.reply({ content: aiResponse });
            }

            // Log para monitoreo (solo en desarrollo)
            if (process.env.NODE_ENV === 'development') {
                const stats = aiService.getStats();
                logger.info(`AI Request completado - Usuario: ${userId}, Queue: ${stats.queueLength}, Conversaciones activas: ${stats.activeConversations}`);
            }
        } catch (error: any) {
            logger.error(`Error en comando AI para usuario ${userId}:`, error);
            await message.reply({ content: `❌ Error del Servicio de IA: ${error.message || 'Error desconocido del servicio'}` });
        } finally {
            // Limpiar indicador de escritura
            clearInterval(typingInterval);
        }
    }
}