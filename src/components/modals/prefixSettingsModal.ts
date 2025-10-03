import logger from "../../core/lib/logger";
import {ModalSubmitInteraction, MessageFlags} from "discord.js";
import type { Modal } from '../../core/types/components';
import type Amayo from '../../core/client';

export default {
    customId: "prefixsettingsmodal",
    run: async (interaction: ModalSubmitInteraction, client: Amayo) => {
        const newPrefix = interaction.fields.getTextInputValue("prefixInput");

        if (!newPrefix || newPrefix.length > 10) {
            return interaction.reply({
                content: '❌ El prefix debe tener entre 1 y 10 caracteres.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            // Aquí puedes guardar el prefix en la base de datos usando client.prisma
            // Por ahora solo confirmamos el cambio
            await interaction.reply({
                content: `✅ Prefix cambiado a: \`${newPrefix}\``,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            logger.error('Error cambiando prefix:', error);
            await interaction.reply({
                content: '❌ Error al cambiar el prefix.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
} satisfies Modal;
