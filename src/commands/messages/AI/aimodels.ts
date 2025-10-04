import { CommandMessage } from "../../../core/types/commands";
import { aiService } from "../../../core/services/AIService";
import logger from "../../../core/lib/logger";

export const command: CommandMessage = {
    name: 'aimodels',
    type: 'message',
    aliases: ['listmodels'],
    cooldown: 10,
    description: 'Lista modelos de imagen disponibles y muestra el actual.',
    category: 'IA',
    usage: 'aimodels',
    run: async (message, args) => {
        try {
            const models = await aiService.listImageModels();
            const current = (aiService as any).imageModelName || 'No detectado';
            
            if (models.length === 0) {
                await message.reply({
                    content: `**Modelos de imagen disponibles:** Ninguno detectado
**Modelo actual:** ${current}

Para usar un modelo específico:
\`GENAI_IMAGE_MODEL=imagen-3.0-fast\``
                });
                return;
            }

            const modelList = models.map(m => `• ${m}`).join('\n');
            await message.reply({
                content: `**Modelos de imagen disponibles:**
${modelList}

**Modelo actual:** ${current}

Para cambiar: \`GENAI_IMAGE_MODEL=nombre_del_modelo\``
            });
        } catch (error: any) {
            logger.error(error, 'Error listando modelos');
            await message.reply({ content: `❌ Error: ${error?.message || 'Error desconocido'}` });
        }
    }
};
