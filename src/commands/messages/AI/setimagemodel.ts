import { CommandMessage } from "../../../core/types/commands";
import { aiService } from "../../../core/services/AIService";
import logger from "../../../core/lib/logger";

export const command: CommandMessage = {
    name: 'setimagemodel',
    type: 'message',
    aliases: ['setmodel'],
    cooldown: 5,
    description: 'Establece el modelo de imágenes manualmente.',
    category: 'IA',
    usage: 'setimagemodel <modelo>',
    run: async (message, args) => {
        try {
            if (!args || args.length === 0) {
                await message.reply({
                    content: 'Uso: setimagemodel <modelo>\nEjemplo: setimagemodel imagen-3.0-fast'
                });
                return;
            }

            const model = args.join(' ').trim();
            (aiService as any).setImageModel(model);
            
            await message.reply({
                content: `✅ Modelo de imágenes establecido: \`${model}\`\nPrueba con: \`aiimg un gato astronauta\``
            });
        } catch (error: any) {
            logger.error(error, 'Error estableciendo modelo');
            await message.reply({ content: `❌ Error: ${error?.message || 'Error desconocido'}` });
        }
    }
};
