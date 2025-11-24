/**
 * v14-compatible Modal Builder
 * Replaces all v15-dev ComponentType.Label modal structures
 */

import {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
} from "discord.js";

export interface ModalFieldConfig {
  customId: string;
  label: string;
  style: "short" | "paragraph";
  placeholder?: string;
  value?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface ModalConfig {
  title: string;
  customId: string;
  fields: ModalFieldConfig[];
}

/**
 * Create a v14-compatible modal with multiple text inputs
 *
 * @example
 * const modal = createModal({
 *   title: 'Edit Title',
 *   customId: 'edit_title_modal',
 *   fields: [{
 *     customId: 'title_input',
 *     label: 'New Title',
 *     style: 'short',
 *     placeholder: 'Enter title...',
 *     maxLength: 256
 *   }]
 * });
 *
 * await interaction.showModal(modal);
 */
export function createModal(config: ModalConfig): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(config.customId)
    .setTitle(config.title);

  for (const field of config.fields) {
    const inputBuilder = new TextInputBuilder()
      .setCustomId(field.customId)
      .setLabel(field.label)
      .setStyle(
        field.style === "short"
          ? TextInputStyle.Short
          : TextInputStyle.Paragraph
      );

    // Optional properties
    if (field.placeholder !== undefined) {
      inputBuilder.setPlaceholder(field.placeholder);
    }

    if (field.value !== undefined) {
      inputBuilder.setValue(field.value);
    }

    if (field.required !== undefined) {
      inputBuilder.setRequired(field.required);
    }

    if (field.minLength !== undefined) {
      inputBuilder.setMinLength(field.minLength);
    }

    if (field.maxLength !== undefined) {
      inputBuilder.setMaxLength(field.maxLength);
    }

    // Add to modal wrapped in ActionRow
    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
      inputBuilder
    );
    modal.addComponents(row as any); // v14 typing workaround
  }

  return modal;
}

/**
 * Quick builders for common modal patterns
 */

export function createSingleFieldModal(params: {
  title: string;
  customId: string;
  fieldLabel: string;
  fieldId: string;
  style?: "short" | "paragraph";
  placeholder?: string;
  value?: string;
  maxLength?: number;
  required?: boolean;
}): ModalBuilder {
  return createModal({
    title: params.title,
    customId: params.customId,
    fields: [
      {
        customId: params.fieldId,
        label: params.fieldLabel,
        style: params.style || "short",
        placeholder: params.placeholder,
        value: params.value,
        maxLength: params.maxLength,
        required: params.required ?? true,
      },
    ],
  });
}

export function createTitleModal(params: {
  customId: string;
  currentTitle?: string;
}): ModalBuilder {
  return createSingleFieldModal({
    title: "✏️ Editar Título",
    customId: params.customId,
    fieldLabel: "Nuevo Título",
    fieldId: "title_input",
    style: "short",
    placeholder: "Ingresa el título del bloque...",
    value: params.currentTitle,
    maxLength: 256,
  });
}

export function createDescriptionModal(params: {
  customId: string;
  currentDescription?: string;
}): ModalBuilder {
  return createSingleFieldModal({
    title: "📝 Editar Descripción",
    customId: params.customId,
    fieldLabel: "Nueva Descripción",
    fieldId: "description_input",
    style: "paragraph",
    placeholder: "Ingresa la descripción del bloque...",
    value: params.currentDescription,
    maxLength: 4096,
  });
}

export function createColorModal(params: {
  customId: string;
  currentColor?: string;
}): ModalBuilder {
  return createSingleFieldModal({
    title: "🎨 Editar Color",
    customId: params.customId,
    fieldLabel: "Color (hex, nombre, o decimal)",
    fieldId: "color_input",
    style: "short",
    placeholder: "Ej: #FF5733, red, blurple, 16733299",
    value: params.currentColor,
    maxLength: 50,
  });
}

export function createTextContentModal(params: {
  customId: string;
  currentContent?: string;
}): ModalBuilder {
  return createSingleFieldModal({
    title: "📄 Añadir Contenido de Texto",
    customId: params.customId,
    fieldLabel: "Contenido",
    fieldId: "content_input",
    style: "paragraph",
    placeholder: "Ingresa el contenido de texto...",
    value: params.currentContent,
    maxLength: 4000,
  });
}

export function createImageUrlModal(params: {
  customId: string;
  currentUrl?: string;
  title?: string;
}): ModalBuilder {
  return createSingleFieldModal({
    title: params.title || "🖼️ Añadir Imagen",
    customId: params.customId,
    fieldLabel: "URL de la Imagen (HTTPS)",
    fieldId: "image_input",
    style: "short",
    placeholder: "https://ejemplo.com/imagen.png",
    value: params.currentUrl,
    maxLength: 512,
  });
}
