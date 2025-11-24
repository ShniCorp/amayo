import type { ButtonInteraction } from "discord.js";
import {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { Button } from "../../core/types/components";
import type Amayo from "../../core/client";

export default {
  customId: "prefixsettings",
  run: async (interaction: ButtonInteraction, client: Amayo) => {
    const modal = new ModalBuilder()
      .setCustomId("prefixsettingsmodal")
      .setTitle("Cambiar Prefix");

    const prefixInput = new TextInputBuilder()
      .setCustomId("prefixInput")
      .setLabel("Nuevo Prefix")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("Ej: !, ?, $")
      .setMaxLength(5);

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      prefixInput
    );

    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  },
} satisfies Button;
