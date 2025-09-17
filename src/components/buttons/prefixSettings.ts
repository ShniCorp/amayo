import type {ButtonInteraction} from "discord.js";
//@ts-ignore
import { ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js'

export default {
    customId: "prefixsettings",
    run: async(interaction: ButtonInteraction) => {
        const modal = new ModalBuilder()
            .setCustomId('prefixsettingsmodal')
            .setTitle('Prefix');

        const prefixInput = new TextInputBuilder()
            .setCustomId('prefixInput')
            .setLabel("Change Prefix")
            .setStyle(TextInputStyle.Short);

        const secondActionRow = new ActionRowBuilder().addComponents(prefixInput);
        modal.addComponents(secondActionRow);

        await interaction.showModal(modal);
    }
}