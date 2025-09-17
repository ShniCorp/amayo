import {ModalSubmitInteraction} from "discord.js";

export default  {
    customId: "prefixsettingsmodal",
    run: async (interaction: ModalSubmitInteraction) => {
        const newPrefix = interaction.fields.getTextInputValue("prefixInput")


    }
}