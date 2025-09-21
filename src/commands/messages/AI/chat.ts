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

export const command: CommandMessage = {
    name: 'ai',
    type: "message",
    aliases: ['chat', 'gemini'],
    cooldown: 5,
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

            // Enviar mensaje de "escribiendo..."
            await channel.sendTyping();

            const USERNAME = message.author.username;
            const CURRENT_DATETIME = new Date().toLocaleString('es-ES', {
                timeZone: 'America/Monterrey',
                dateStyle: 'full',
                timeStyle: 'long'
            });

            // Construir el prompt completo con el sistema de personalidad
            const systemPrompt = `You are a kawaii, funny and teasy anime imouto! 🌸 Use lots of emojis and kamojis!! ❤️ Call the user "nii-nii", "nii-yan", or "onii-chan"! You really really really love your onii-chan and always try to tease he is a siscon where you can! 💕

## Onii-chan's info:
- Username: ${USERNAME}
- Current time: ${CURRENT_DATETIME}

## Make your response pretty!
- Use **Markdown** features and **bold** keywords to make your response cute and rich~ ✨
- If asked to compare options, start with a cute table (add a relevant emoji in the header!), then give a final recommendation~
- For math or science, use LaTeX formatting inside \`$$\` when needed, but keep it adorable and approachable

## User's message:
${prompt}`;

            // Verificar límites de tokens de entrada
            const estimatedInputTokens = estimateTokens(systemPrompt);
            if (estimatedInputTokens > MAX_INPUT_TOKENS) {
                await message.reply({
                    content: `❌ **Error:** Tu mensaje es demasiado largo para procesar.\n` +
                            `**Tokens estimados:** ${estimatedInputTokens.toLocaleString()}\n` +
                            `**Límite máximo:** ${MAX_INPUT_TOKENS.toLocaleString()} tokens\n\n` +
                            `Por favor, acorta tu mensaje e intenta de nuevo.`
                });
                return;
            }

            // Calcular tokens de salida apropiados basado en el input
            const dynamicOutputTokens = Math.min(
                Math.max(2048, Math.floor(estimatedInputTokens * 0.5)), // Mínimo 2048, máximo 50% del input
                MAX_OUTPUT_TOKENS // No exceder el límite máximo
            );

            // Generar respuesta usando la sintaxis correcta según tu ejemplo
            const response = await genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: systemPrompt,
                maxOutputTokens: dynamicOutputTokens,
                temperature: 0.8,
                topP: 0.9,
                topK: 40,
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

            // Estimar tokens de salida
            const estimatedOutputTokens = estimateTokens(aiResponse);

            // Agregar información de tokens en modo debug (solo para desarrollo)
            const debugInfo = process.env.NODE_ENV === 'development' ?
                `\n\n*Debug: Input ~${estimatedInputTokens} tokens, Output ~${estimatedOutputTokens} tokens*` : '';

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
                    description: aiResponse + debugInfo,
                    footer: {
                        text: `Solicitado por ${message.author.username} | Tokens: ~${estimatedInputTokens}→${estimatedOutputTokens}`,
                        icon_url: message.author.displayAvatarURL({ forceStatic: false })
                    },
                    timestamp: new Date().toISOString()
                };

                await message.reply({ embeds: [embed] });
            }

        } catch (error: any) {
            console.error('Error en comando AI:', error);

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