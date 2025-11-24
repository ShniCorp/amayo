import {
  ButtonStyle,
  ComponentType,
  APIButtonComponent,
  APISelectMenuComponent,
  GuildMember,
  Guild,
} from "discord.js";
import {
  DisplayComponent,
  DisplayComponentContainer,
  BlockConfig,
  COMPONENT_TYPES,
} from "./displayComponents";
import { DisplayComponentV2Builder } from "../lib/displayComponents/builders";
import { replaceVars, isValidUrlOrVariable } from "../lib/vars";

// Editor-specific component types (how we store configuration while editing)
export interface EditorTextDisplay {
  type: 10; // TextDisplay
  content: string;
  thumbnail?: string | null; // optional image URL
  linkButton?: LinkButton | null; // optional link button accessory
}

export interface EditorSeparator {
  type: 14; // Separator
  divider?: boolean;
  spacing?: number; // 1-3 typical
}

export interface EditorImage {
  type: 12; // Image/Media
  url: string; // single image URL (later rendered as items: [{ media: { url } }])
}

export interface EditorButton {
  type: 2; // Button
  style: ButtonStyle;
  label?: string;
  emoji?: string;
  url?: string; // For Link buttons
  customId?: string; // For Functional buttons
}

export type EditorComponent =
  | EditorTextDisplay
  | EditorSeparator
  | EditorImage
  | EditorButton;

// Block state for editing/creating
export interface BlockState {
  title?: string;
  description?: string;
  color?: number;
  coverImage?: string;
  components: EditorComponent[];
}

export const DESCRIPTION_PLACEHOLDER = "Usa los botones para configurar.";

export const normalizeDisplayContent = (value?: string | null): string => {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
};

export function syncDescriptionComponent(
  blockState: BlockState,
  incomingDescription: string | undefined | null,
  options: { previousDescription?: string | null; placeholder?: string } = {}
): void {
  if (!Array.isArray(blockState.components)) {
    blockState.components = [];
  }

  const placeholder = normalizeDisplayContent(
    options.placeholder ?? DESCRIPTION_PLACEHOLDER
  );
  const previousRaw =
    options.previousDescription ?? blockState.description ?? "";
  const trimmedPrevious = normalizeDisplayContent(previousRaw);
  const trimmedIncoming = normalizeDisplayContent(incomingDescription);

  const textIndex = blockState.components.findIndex(
    (component: EditorComponent) =>
      component?.type === 10 &&
      !(component as EditorTextDisplay).thumbnail &&
      !(component as EditorTextDisplay).linkButton
  );

  const textComponent =
    textIndex >= 0 && blockState.components[textIndex]?.type === 10
      ? (blockState.components[textIndex] as EditorTextDisplay)
      : null;

  const currentTrimmed = textComponent
    ? normalizeDisplayContent(textComponent.content)
    : "";

  const matchesPrevious =
    trimmedPrevious.length > 0 && currentTrimmed === trimmedPrevious;
  const matchesPlaceholder = currentTrimmed === placeholder;
  const canMutateCurrent =
    textIndex >= 0 &&
    (matchesPrevious || matchesPlaceholder || trimmedPrevious.length === 0);

  if (trimmedIncoming.length > 0) {
    blockState.description = incomingDescription ?? trimmedIncoming;

    if (textComponent) {
      if (canMutateCurrent) {
        textComponent.content = trimmedIncoming;
        if (textComponent.thumbnail === undefined) {
          textComponent.thumbnail = null;
        }
      }
    } else if (trimmedPrevious.length === 0) {
      blockState.components.unshift({
        type: 10,
        content: incomingDescription ?? trimmedIncoming,
        thumbnail: null,
      } as EditorTextDisplay);
    }
    return;
  }

  // No description provided -> clear and restore placeholder if applicable
  blockState.description = undefined;

  if (textComponent) {
    if (canMutateCurrent) {
      textComponent.content = placeholder;
      if (textComponent.thumbnail === undefined) {
        textComponent.thumbnail = null;
      }
    }
    return;
  }

  if (trimmedPrevious.length === 0 || matchesPrevious) {
    blockState.components.unshift({
      type: 10,
      content: placeholder,
      thumbnail: null,
    } as EditorTextDisplay);
  }
}

export function ensureDescriptionTextComponent(
  blockState: BlockState,
  options: { placeholder?: string } = {}
): number | null {
  if (!Array.isArray(blockState.components)) {
    blockState.components = [];
  }

  const placeholder = normalizeDisplayContent(
    options.placeholder ?? DESCRIPTION_PLACEHOLDER
  );
  const descriptionRaw = blockState.description ?? "";
  const normalizedDescription = normalizeDisplayContent(descriptionRaw);

  const findIndexByContent = (target: string) =>
    blockState.components.findIndex(
      (component: any) =>
        component?.type === 10 &&
        typeof component.content === "string" &&
        normalizeDisplayContent(component.content) ===
          normalizeDisplayContent(target)
    );

  if (normalizedDescription.length > 0) {
    const existingIndex = findIndexByContent(descriptionRaw);
    if (existingIndex >= 0) return existingIndex;
    blockState.components.unshift({
      type: 10,
      content: descriptionRaw,
      thumbnail: null,
    } as EditorTextDisplay);
    return 0;
  }

  const placeholderIndex = findIndexByContent(placeholder);
  if (placeholderIndex >= 0) return placeholderIndex;

  blockState.components.unshift({
    type: 10,
    content: options.placeholder ?? DESCRIPTION_PLACEHOLDER,
    thumbnail: null,
  } as EditorTextDisplay);
  return 0;
}

// Emoji input types
export interface CustomEmoji {
  id: string;
  name: string;
  animated?: boolean;
}

export interface UnicodeEmoji {
  name: string;
}

export type EmojiInput = CustomEmoji | UnicodeEmoji;

// Link button configuration
export interface LinkButton {
  url: string;
  label?: string;
  emoji?: string;
}

// Action row builders
export interface EditorActionRow {
  type: ComponentType.ActionRow;
  components: APIButtonComponent[];
}

export interface SelectActionRow {
  type: ComponentType.ActionRow;
  components: APISelectMenuComponent[];
}

// Utility functions
export class DisplayComponentUtils {
  /**
   * Validates if a URL is valid or a system variable
   */
  static isValidUrl(url: string): boolean {
    return isValidUrlOrVariable(url);
  }

  /**
   * Validates and cleans content for Discord
   */
  static validateContent(content: string): string {
    if (!content || typeof content !== "string") {
      return "Sin contenido";
    }

    const cleaned = content.trim();
    if (cleaned.length === 0) {
      return "Sin contenido";
    }

    // Truncate if exceeds Discord limit (4000 characters)
    if (cleaned.length > 4000) {
      return cleaned.substring(0, 3997) + "...";
    }

    return cleaned;
  }

  /**
   * Parses emoji input (unicode or custom <a:name:id> / <:name:id>)
   */
  static parseEmojiInput(input?: string): EmojiInput | null {
    if (!input) return null;

    const trimmed = input.trim();
    if (!trimmed) return null;

    const match = trimmed.match(/^<(a?):(\w+):(\d+)>$/);
    if (match) {
      const animated = match[1] === "a";
      const name = match[2];
      const id = match[3];
      return { id, name, animated };
    }

    // Assume unicode if not custom emoji format
    return { name: trimmed };
  }

  /**
   * Builds a link accessory for Display Components
   */
  static async buildLinkAccessory(
    link: LinkButton,
    member: GuildMember,
    guild: Guild
  ): Promise<any | null> {
    if (!link || !link.url) return null;

    const processedUrl = await replaceVars(link.url, member, guild);
    if (!this.isValidUrl(processedUrl)) return null;

    const accessory: any = {
      type: 2, // Button
      style: ButtonStyle.Link,
      url: processedUrl,
    };

    if (
      link.label &&
      typeof link.label === "string" &&
      link.label.trim().length > 0
    ) {
      accessory.label = link.label.trim().slice(0, 80);
    }

    if (link.emoji && typeof link.emoji === "string") {
      const parsed = this.parseEmojiInput(link.emoji);
      if (parsed) accessory.emoji = parsed;
    }

    // Must have at least label or emoji
    if (!accessory.label && !accessory.emoji) {
      return null;
    }

    return accessory;
  }

  /**
   * Renders preview of a block
   */
  static async renderPreview(
    blockState: BlockState,
    member: GuildMember,
    guild: Guild
  ): Promise<DisplayComponentContainer> {
    const builder = new DisplayComponentV2Builder();
    if (blockState.color) {
      builder.setAccentColor(blockState.color);
    }

    // Add cover image first if exists
    if (blockState.coverImage && this.isValidUrl(blockState.coverImage)) {
      const processedCoverUrl = await replaceVars(
        blockState.coverImage,
        member,
        guild
      );
      if (this.isValidUrl(processedCoverUrl)) {
        builder.addImage(processedCoverUrl);
      }
    }

    // Add title after cover - VALIDATE CONTENT
    const processedTitle = await replaceVars(
      blockState.title ?? "Sin título",
      member,
      guild
    );
    builder.addText(this.validateContent(processedTitle));

    // Optional description section (before additional components)
    const rawDescription =
      typeof blockState.description === "string"
        ? blockState.description.trim()
        : "";
    if (rawDescription.length > 0) {
      const processedDescription = await replaceVars(
        rawDescription,
        member,
        guild
      );
      const validatedDescription = this.validateContent(processedDescription);

      const firstTextComponent = Array.isArray(blockState.components)
        ? blockState.components.find(
            (c: any) => c?.type === 10 && typeof c.content === "string"
          )
        : null;
      const duplicatesWithFirstText = Boolean(
        firstTextComponent?.type === 10 &&
          typeof (firstTextComponent as EditorTextDisplay).content ===
            "string" &&
          (firstTextComponent as EditorTextDisplay).content.trim() ===
            rawDescription
      );

      if (!duplicatesWithFirstText) {
        builder.addText(validatedDescription);
      }
    }

    // Process components in order
    for (const c of blockState.components) {
      if (c.type === 10) {
        const processedThumbnail = c.thumbnail
          ? await replaceVars(c.thumbnail, member, guild)
          : null;
        const processedContent = await replaceVars(
          c.content || "Sin contenido",
          member,
          guild
        );
        const validatedContent = this.validateContent(processedContent);

        // Build accessory by priority: linkButton > thumbnail
        let accessory: any = null;
        if (c.linkButton) {
          const built = await this.buildLinkAccessory(
            c.linkButton,
            member,
            guild
          );
          if (built) accessory = built;
        }
        if (
          !accessory &&
          processedThumbnail &&
          this.isValidUrl(processedThumbnail)
        ) {
          accessory = {
            type: 11,
            media: { url: processedThumbnail },
          };
        }

        if (accessory) {
          builder.addSection(validatedContent, accessory);
        } else {
          // No valid accessory
          builder.addText(validatedContent);
        }
      } else if (c.type === 14) {
        // Separator
        builder.addSeparator(c.spacing ?? 1, c.divider ?? true);
      } else if (c.type === 12) {
        // Image
        const processedImageUrl = await replaceVars(c.url, member, guild);
        if (this.isValidUrl(processedImageUrl)) {
          builder.addImage(processedImageUrl);
        }
      } else if (c.type === 2) {
        // Button (Normal or Link)
        const btn = c as EditorButton;
        if (btn.style === 5 && btn.url) {
          // Link button
          const processedUrl = await replaceVars(btn.url, member, guild);
          if (this.isValidUrl(processedUrl)) {
            const parsedEmoji = btn.emoji
              ? this.parseEmojiInput(btn.emoji)
              : undefined;
            builder.addLinkButton(
              btn.label || "Link",
              processedUrl,
              parsedEmoji || undefined
            );
          }
        } else if (btn.customId) {
          // Normal button
          const parsedEmoji = btn.emoji
            ? this.parseEmojiInput(btn.emoji)
            : undefined;
          builder.addButton(
            btn.label || "Button",
            btn.style,
            btn.customId,
            parsedEmoji || undefined
          );
        }
      }
    }

    return builder.toJSON();
  }

  /**
   * Creates editor button rows
   */
  static createEditorButtons(disabled = false): EditorActionRow[] {
    return [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "📝 Título",
            disabled,
            custom_id: "edit_title",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "📄 Descripción",
            disabled,
            custom_id: "edit_description",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "🎨 Color",
            disabled,
            custom_id: "edit_color",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "➕ Contenido",
            disabled,
            custom_id: "add_content",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "➖ Separador",
            disabled,
            custom_id: "add_separator",
          },
        ],
      },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "🖼️ Imagen",
            disabled,
            custom_id: "add_image",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "🖼️ Portada",
            disabled,
            custom_id: "cover_image",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "📎 Thumbnail",
            disabled,
            custom_id: "edit_thumbnail",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "🔗 Crear Botón Link",
            disabled,
            custom_id: "edit_link_button",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Primary,
            label: "🔄 Mover",
            disabled,
            custom_id: "move_block",
          },
        ],
      },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "🎯 Variables",
            disabled,
            custom_id: "show_variables",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "📋 Duplicar",
            disabled,
            custom_id: "duplicate_block",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "📊 Vista Raw",
            disabled,
            custom_id: "show_raw",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "📥 Importar",
            disabled,
            custom_id: "import_json",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "📤 Exportar",
            disabled,
            custom_id: "export_json",
          },
        ],
      },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ButtonStyle.Success,
            label: "💾 Guardar",
            disabled,
            custom_id: "save_block",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Danger,
            label: "❌ Cancelar",
            disabled,
            custom_id: "cancel_block",
          },
          {
            type: ComponentType.Button,
            style: ButtonStyle.Danger,
            label: "🗑️ Eliminar",
            disabled,
            custom_id: "delete_block",
          },
        ],
      },
    ];
  }
}
