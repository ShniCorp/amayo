import {
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle as DiscordTextInputStyle,
} from "discord.js";
import { TextInputStyle as APITextInputStyle } from "discord-api-types/v10";

/**
 * Field configuration for modal text inputs
 */
export interface ModalField {
  customId: string;
  style: DiscordTextInputStyle | APITextInputStyle;
  placeholder?: string;
  value?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  label: string;
}

/**
 * Creates a discord.js v14 compatible modal with text inputs
 * Replaces the old v15-dev Label component pattern
 */
export function createModalV14(params: {
  title: string;
  customId: string;
  fields: ModalField[];
}): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(params.customId)
    .setTitle(params.title);

  const actionRows = params.fields.map((field) => {
    // Convert API TextInputStyle enum to Discord.js TextInputStyle enum if needed
    let style: DiscordTextInputStyle;
    if (typeof field.style === "number") {
      // It's an API style number, convert it
      style = field.style as DiscordTextInputStyle;
    } else {
      style = field.style;
    }

    const textInput = new TextInputBuilder()
      .setCustomId(field.customId)
      .setLabel(field.label)
      .setStyle(style)
      .setRequired(field.required ?? false);

    if (field.placeholder) textInput.setPlaceholder(field.placeholder);
    if (field.value) textInput.setValue(field.value);
    if (field.maxLength !== undefined) textInput.setMaxLength(field.maxLength);
    if (field.minLength !== undefined) textInput.setMinLength(field.minLength);

    return new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
  });

  modal.addComponents(...actionRows);
  return modal;
}

/**
 * Helper to get text input value from modal submission components
 * This replaces the old components.getTextInputValue pattern
 */
export function getModalTextInputValue(
  components: ReturnType<any>,
  customId: string
): string {
  for (const actionRow of components) {
    for (const component of actionRow.components) {
      if (component.customId === customId) {
        return component.value;
      }
    }
  }
  throw new Error(`Text input with customId "${customId}" not found`);
}
