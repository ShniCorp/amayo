import { CommandMessage } from "../../../core/types/commands";
import { aiService } from "../../../core/services/AIService";
import logger from "../../../core/lib/logger";

function parseSizeArg(arg?: string): 'square' | 'portrait' | 'landscape' {
    if (!arg) return 'square';
    const v = arg.toLowerCase();
    if (v === 'square' || v === 'cuadrado' || v === '1:1') return 'square';
    if (v === 'portrait' || v === 'vertical' || v === '9:16') return 'portrait';
    if (v === 'landscape' || v === 'horizontal' || v === '16:9') return 'landscape';
    return 'square';
}

export const command: CommandMessage = {
    name: 'aiimg',
    type: 'message',
    aliases: ['img', 'imagen'],
    cooldown: 5,
    description: 'Genera una imagen con Gemini (gemini-2.5-flash-image).',
    category: 'IA',
    usage: 'aiimg [square|portrait|landscape] <prompt>',
    run: async (message, args) => {
        try {
            if (!args || args.length === 0) {
                await message.reply({
                    content: 'Uso: aiimg [square|portrait|landscape] <prompt>\nEjemplo: aiimg portrait un gato astronauta'
                });
                return;
            }

            let size: 'square' | 'portrait' | 'landscape' = 'square';
            let prompt = args.join(' ').trim();

            // Si el primer arg es un tamaño válido, usarlo y quitarlo del prompt
            const maybeSize = parseSizeArg(args[0]);
            if (maybeSize !== 'square' || ['square', 'cuadrado', '1:1'].includes(args[0]?.toLowerCase?.() ?? '')) {
                // Detect explicit size keyword; if first arg matches any known size token, shift it
                if (['square','cuadrado','1:1','portrait','vertical','9:16','landscape','horizontal','16:9'].includes(args[0].toLowerCase())) {
                    size = maybeSize;
                    prompt = args.slice(1).join(' ').trim();
                }
            }

            if (!prompt) {
                await message.reply({ content: 'El prompt no puede estar vacío.' });
                return;
            }

            (message.channel as any)?.sendTyping?.().catch(() => {});
            const result = await aiService.generateImage(prompt, { size });

            await message.reply({
                content: `✅ Imagen generada (${size}).`,
                files: [{ attachment: result.data, name: result.fileName }]
            });
        } catch (error: any) {
            logger.error(error, 'Error generando imagen');
            await message.reply({ content: `❌ Error generando imagen: ${error?.message || 'Error desconocido'}` });
        }
    }
};
