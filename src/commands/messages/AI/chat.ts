import logger from "../../../core/lib/logger";
import { GoogleGenAI } from "@google/genai";
import {CommandMessage} from "../../../core/types/commands";
import { TextChannel, DMChannel, NewsChannel, ThreadChannel } from "discord.js";

// Función para estimar tokens aproximadamente (1 token ≈ 4 caracteres para texto en español/inglés)
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

// Límites de tokens según Gemini 2.5 Flash
const MAX_INPUT_TOKENS = 1048576;  // 1M tokens de entrada
const MAX_OUTPUT_TOKENS = 65536;   // 64K tokens de salida
const TOKEN_RESET_THRESHOLD = 0.85; // Resetear cuando esté al 85% del límite

// Estado de conversación por usuario (memoria simple en memoria)
const conversationHistory = new Map<string, {
    messages: string[],
    totalTokens: number,
    imageCount: number
}>();

export const command: CommandMessage = {
    name: 'ai',
    type: "message",
    aliases: ['chat', 'gemini'],
    cooldown: 5,
    description: 'Chatea con la IA (Gemini) directamente desde Discord.',
    category: 'IA',
    usage: 'ai <mensaje>',
    run: async (message, args) => {
        // Verificar que se proporcione un prompt
        if (!args || args.length === 0) {
            await message.reply({
                content: "❌ **Error:** Necesitas proporcionar un mensaje para la IA.\n" +
                        "**Uso:** `ai <tu mensaje>`\n" +
                        "**Ejemplo:** `ai ¿Cómo funciona JavaScript?`"
            });
            return;
        }

        const prompt = args.join(' ');
        const userId = message.author.id;

        // Validar longitud del prompt
        if (prompt.length > 4000) {
            await message.reply({
                content: "❌ **Error:** Tu mensaje es demasiado largo. El límite es de 4000 caracteres."
            });
            return;
        }

        // Verificar que el canal sea de texto
        const channel = message.channel as TextChannel | DMChannel | NewsChannel | ThreadChannel;
        if (!channel || !('send' in channel)) {
            await message.reply({
                content: "❌ **Error:** Este comando no se puede usar en este tipo de canal."
            });
            return;
        }

        try {
            // Inicializar Google Gemini con configuración desde variables de entorno
            const genAI = new GoogleGenAI({
                apiKey: process.env.GOOGLE_AI_API_KEY
            });

            // Obtener o inicializar historial de conversación del usuario
            let userHistory = conversationHistory.get(userId);
            if (!userHistory) {
                userHistory = { messages: [], totalTokens: 0, imageCount: 0 };
                conversationHistory.set(userId, userHistory);
            }

            // Enviar mensaje de "escribiendo..."
            await channel.sendTyping();

            const USERNAME = message.author.username;
            const CURRENT_DATETIME = new Date().toLocaleString('es-ES', {
                timeZone: 'America/Monterrey',
                dateStyle: 'full',
                timeStyle: 'long'
            });

            // Detectar si el usuario quiere generar una imagen
            const imageKeywords = ['imagen', 'image', 'dibujo', 'draw', 'generar imagen', 'create image', 'picture', 'foto'];
            const isImageRequest = imageKeywords.some(keyword =>
                prompt.toLowerCase().includes(keyword.toLowerCase())
            );

            // Construir el prompt del sistema más natural y menos saturado de emojis
            const baseSystemPrompt = `Eres una hermana mayor kawaii y cariñosa que habla por Discord. Responde de manera natural y útil, pero con personalidad tierna.

## Información del usuario:
- Username: ${USERNAME}
- Fecha actual: ${CURRENT_DATETIME}

## Reglas importantes para Discord:
- NUNCA uses LaTeX ($$), solo usa **markdown normal de Discord**
- Para matemáticas usa: **negrita**, *cursiva*, \`código\` y bloques de código
- NO uses emojis excesivamente, máximo 2-3 por respuesta
- Para tablas usa formato simple de Discord con backticks
- Mantén las respuestas claras y legibles en Discord

## Ejemplos de formato correcto:
- Matemáticas: "La raíz cuadrada de 16 es **4**"
- Código: \`\`\`javascript\nfunction ejemplo() {}\`\`\`
- Énfasis: **importante** o *destacado*

${isImageRequest ? `
## Generación de imágenes:
- El usuario está pidiendo una imagen
- Gemini 2.5 Flash NO puede generar imágenes
- Explica que no puedes generar imágenes pero ofrece ayuda alternativa
` : ''}

## Mensaje del usuario:
${prompt}

## Contexto de conversación anterior:
${userHistory.messages.slice(-3).join('\n')}`;

            // Verificar límites de tokens de entrada
            const estimatedInputTokens = estimateTokens(baseSystemPrompt);

            // Verificar si necesitamos resetear la conversación
            if (userHistory.totalTokens > MAX_INPUT_TOKENS * TOKEN_RESET_THRESHOLD) {
                userHistory.messages = [];
                userHistory.totalTokens = 0;
                await message.reply({
                    content: "🔄 **Conversación reseteada** - Límite de tokens alcanzado, empezamos de nuevo."
                });
            }

            // Verificar si necesitamos resetear por imágenes
            if (isImageRequest && userHistory.imageCount >= 5) {
                userHistory.messages = [];
                userHistory.totalTokens = 0;
                userHistory.imageCount = 0;
                await message.reply({
                    content: "🔄 **Conversación reseteada** - Límite de solicitudes de imagen alcanzado (5), empezamos de nuevo."
                });
            }

            if (estimatedInputTokens > MAX_INPUT_TOKENS) {
                await message.reply({
                    content: `❌ **Error:** Tu mensaje es demasiado largo para procesar.\n` +
                            `**Tokens estimados:** ${estimatedInputTokens.toLocaleString()}\n` +
                            `**Límite máximo:** ${MAX_INPUT_TOKENS.toLocaleString()} tokens\n\n` +
                            `Por favor, acorta tu mensaje e intenta de nuevo.`
                });
                return;
            }

            // Calcular tokens de salida apropiados
            const dynamicOutputTokens = Math.min(
                Math.max(1024, Math.floor(estimatedInputTokens * 0.3)), // Mínimo 1024, máximo 30% del input
                MAX_OUTPUT_TOKENS
            );

            // Generar respuesta
            const response = await genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: baseSystemPrompt,
                // @ts-ignore
                generationConfig: {
                    maxOutputTokens: dynamicOutputTokens,
                    temperature: 0.7, // Reducido para respuestas más consistentes
                    topP: 0.8,
                    topK: 30,
                }
            });

            // Extraer el texto de la respuesta
            const aiResponse = response.text;

            // Verificar si la respuesta está vacía
            if (!aiResponse || aiResponse.trim().length === 0) {
                await message.reply({
                    content: "❌ **Error:** La IA no pudo generar una respuesta. Intenta reformular tu pregunta."
                });
                return;
            }

            // Actualizar historial y contadores
            const estimatedOutputTokens = estimateTokens(aiResponse);
            userHistory.messages.push(`Usuario: ${prompt}`);
            userHistory.messages.push(`Asistente: ${aiResponse}`);
            userHistory.totalTokens += estimatedInputTokens + estimatedOutputTokens;

            if (isImageRequest) {
                userHistory.imageCount++;
            }

            // Mantener solo los últimos 10 mensajes para evitar crecimiento excesivo
            if (userHistory.messages.length > 10) {
                userHistory.messages = userHistory.messages.slice(-10);
            }

            // Información de debug y estado
            const tokensUsedPercent = ((userHistory.totalTokens / MAX_INPUT_TOKENS) * 100).toFixed(1);
            const debugInfo = process.env.NODE_ENV === 'development' ?
                `\n\n*Debug: Input ~${estimatedInputTokens} tokens, Output ~${estimatedOutputTokens} tokens | Total: ${userHistory.totalTokens} (${tokensUsedPercent}%) | Imágenes: ${userHistory.imageCount}/5*` : '';

            // Advertencia si estamos cerca del límite
            const warningInfo = userHistory.totalTokens > MAX_INPUT_TOKENS * 0.7 ?
                `\n\n⚠️ *Nota: Conversación larga detectada (${tokensUsedPercent}% del límite). Se reseteará pronto.*` : '';

            // Dividir respuesta si es muy larga para Discord (límite de 2000 caracteres)
            if (aiResponse.length > 1900) {
                const chunks = aiResponse.match(/.{1,1900}/gs) || [];

                for (let i = 0; i < chunks.length && i < 3; i++) {
                    const chunk = chunks[i];
                    const embed = {
                        color: 0xFF69B4, // Color rosa kawaii para el tema imouto
                        title: i === 0 ? '🌸 Respuesta de Gemini-chan' : `🌸 Respuesta de Gemini-chan (${i + 1}/${chunks.length})`,
                        description: chunk + (i === chunks.length - 1 ? debugInfo : ''),
                        footer: {
                            text: `Solicitado por ${message.author.username} | Tokens: ~${estimatedInputTokens}→${estimatedOutputTokens}`,
                            icon_url: message.author.displayAvatarURL({ forceStatic: false })
                        },
                        timestamp: new Date().toISOString()
                    };

                    if (i === 0) {
                        await message.reply({ embeds: [embed] });
                    } else {
                        await channel.send({ embeds: [embed] });
                    }

                    // Pequeña pausa entre mensajes
                    if (i < chunks.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                if (chunks.length > 3) {
                    await channel.send({
                        content: "⚠️ **Nota:** La respuesta fue truncada por ser demasiado larga. Intenta hacer preguntas más específicas."
                    });
                }
            } else {
                // Respuesta normal
                const embed = {
                    color: 0xFF69B4, // Color rosa kawaii
                    title: '🌸 Respuesta de Gemini-chan',
                    description: aiResponse + debugInfo + warningInfo,
                    footer: {
                        text: `Solicitado por ${message.author.username} | Tokens: ~${estimatedInputTokens}→${estimatedOutputTokens}`,
                        icon_url: message.author.displayAvatarURL({ forceStatic: false })
                    },
                    timestamp: new Date().toISOString()
                };

                await message.reply({ embeds: [embed] });
            }

        } catch (error: any) {
            logger.error('Error en comando AI:', error);

            // Manejar errores específicos incluyendo límites de tokens
            let errorMessage = "❌ **Error:** Ocurrió un problema al comunicarse con la IA.";

            if (error?.message?.includes('API key') || error?.message?.includes('Invalid API') || error?.message?.includes('authentication')) {
                errorMessage = "❌ **Error:** Token de API inválido o no configurado.";
            } else if (error?.message?.includes('quota') || error?.message?.includes('exceeded') || error?.message?.includes('rate limit')) {
                errorMessage = "❌ **Error:** Se ha alcanzado el límite de uso de la API.";
            } else if (error?.message?.includes('safety') || error?.message?.includes('blocked')) {
                errorMessage = "❌ **Error:** Tu mensaje fue bloqueado por las políticas de seguridad de la IA.";
            } else if (error?.message?.includes('timeout')) {
                errorMessage = "❌ **Error:** La solicitud tardó demasiado tiempo. Intenta de nuevo.";
            } else if (error?.message?.includes('model not found') || error?.message?.includes('not available')) {
                errorMessage = "❌ **Error:** El modelo de IA no está disponible en este momento.";
            } else if (error?.message?.includes('token') || error?.message?.includes('length')) {
                errorMessage = "❌ **Error:** El mensaje excede los límites de tokens permitidos. Intenta con un mensaje más corto.";
            } else if (error?.message?.includes('context_length')) {
                errorMessage = "❌ **Error:** El contexto de la conversación es demasiado largo. La conversación se ha reiniciado.";
            }

            await message.reply({
                content: errorMessage + "\n\nSi el problema persiste, contacta a un administrador."
            });
        }
    }
}