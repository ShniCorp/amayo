import { Message, AttachmentBuilder } from 'discord.js';
import { aiService } from '../../../core/services/AIService';
import logger from '../../../core/lib/logger';

export default {
    name: 'image',
    aliases: ['imagen', 'img', 'aiimage'],
    description: 'Genera una imagen usando IA',
    cooldown: 10,
    async run(message: Message, args: string[]) {
        // Verificar que hay un prompt
        if (!args || args.length === 0) {
            await message.reply('❌ **Error**: Debes proporcionar una descripción para generar la imagen.\n\n**Ejemplo**: `!image un gato espacial flotando entre estrellas`');
            return;
        }

        const prompt = args.join(' ').trim();

        // Validar longitud del prompt
        if (prompt.length < 3) {
            await message.reply('❌ **Error**: La descripción debe tener al menos 3 caracteres.');
            return;
        }

        if (prompt.length > 1000) {
            await message.reply('❌ **Error**: La descripción es demasiado larga (máximo 1000 caracteres).');
            return;
        }

        // Mostrar mensaje de "generando..."
        const thinkingMessage = await message.reply('🎨 **Generando imagen**... Esto puede tomar unos momentos.');

        try {
            logger.info(`Generando imagen para usuario ${message.author.id}: ${prompt.slice(0, 100)}`);

            // Generar la imagen usando el AIService actualizado
            const result = await aiService.generateImage(prompt, {
                size: 'square', // Por defecto usar formato cuadrado
                mimeType: 'image/jpeg',
                numberOfImages: 1,
                personGeneration: true
            });

            // Crear attachment para Discord
            const attachment = new AttachmentBuilder(result.data, {
                name: result.fileName,
                description: `Imagen generada: ${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}`
            });

            // Responder con la imagen
            await thinkingMessage.edit({
                content: `✅ **Imagen generada** para: *${prompt.slice(0, 150)}${prompt.length > 150 ? '...' : ''}*`,
                files: [attachment]
            });

            logger.info(`Imagen generada exitosamente para usuario ${message.author.id}, tamaño: ${result.data.length} bytes`);

        } catch (error) {
            logger.error(`Error generando imagen para usuario ${message.author.id}: ${error}`);

            let errorMessage = '❌ **Error generando imagen**: ';

            if (error instanceof Error) {
                const errorText = error.message.toLowerCase();

                if (errorText.includes('no está disponible') || errorText.includes('not found')) {
                    errorMessage += 'El servicio de generación de imágenes no está disponible en este momento.';
                } else if (errorText.includes('límite') || errorText.includes('quota')) {
                    errorMessage += 'Se ha alcanzado el límite de generación de imágenes. Intenta más tarde.';
                } else if (errorText.includes('bloqueado') || errorText.includes('safety')) {
                    errorMessage += 'Tu descripción fue bloqueada por las políticas de seguridad. Intenta con algo diferente.';
                } else if (errorText.includes('inicializado') || errorText.includes('api')) {
                    errorMessage += 'El servicio no está configurado correctamente.';
                } else {
                    errorMessage += error.message;
                }
            } else {
                errorMessage += 'Error desconocido. Intenta de nuevo más tarde.';
            }

            await thinkingMessage.edit(errorMessage);
        }
    }
};
