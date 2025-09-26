import type {ButtonInteraction} from "discord.js";
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import type { Button } from '../../core/types/components';
import type Amayo from '../../core/client';

export default {
    customId: "prefixsettings",
    run: async (interaction: ButtonInteraction, client: Amayo) => {
        const modal = new ModalBuilder()
            .setCustomId('prefixsettingsmodal')
            .setTitle('Prefix');

        const prefixInput = new TextInputBuilder()
            .setCustomId('prefixInput')
            .setLabel("Change Prefix")
            .setStyle(TextInputStyle.Short);

        const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(prefixInput);
        modal.addComponents(secondActionRow);

        await interaction.showModal(modal);
    }
} satisfies Button;
