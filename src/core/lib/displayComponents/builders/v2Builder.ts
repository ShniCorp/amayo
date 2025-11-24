import {
  DisplayComponentContainer,
  DisplayComponent,
  DisplayComponentText,
  DisplayComponentSeparator,
  DisplayComponentSection,
  DisplayComponentThumbnail,
  COMPONENT_TYPES,
} from "../../../types/displayComponents";

export class DisplayComponentV2Builder {
  private container: DisplayComponentContainer;

  constructor() {
    this.container = {
      type: COMPONENT_TYPES.CONTAINER,
      components: [],
    };
  }

  public setAccentColor(color: number): this {
    this.container.accent_color = color;
    return this;
  }

  public addComponent(component: DisplayComponent): this {
    this.container.components.push(component);
    return this;
  }

  public addText(content: string): this {
    const textComponent: DisplayComponentText = {
      type: COMPONENT_TYPES.TEXT_DISPLAY,
      content: content,
    };
    this.container.components.push(textComponent);
    return this;
  }

  public addSeparator(spacing: number = 1, divider: boolean = false): this {
    const separator: DisplayComponentSeparator = {
      type: COMPONENT_TYPES.SEPARATOR,
      spacing,
      divider,
    };
    this.container.components.push(separator);
    return this;
  }

  public addSection(
    contentOrComponents: string | DisplayComponent[] = [],
    accessory?: any
  ): this {
    const components = Array.isArray(contentOrComponents)
      ? contentOrComponents
      : [
          {
            type: COMPONENT_TYPES.TEXT_DISPLAY,
            content: contentOrComponents,
          } as DisplayComponentText,
        ];

    const section: DisplayComponentSection = {
      type: COMPONENT_TYPES.SECTION,
      components: components,
      accessory: accessory,
    };
    this.container.components.push(section);
    return this;
  }

  public addThumbnail(url: string): this {
    const thumbnail: DisplayComponentThumbnail = {
      type: COMPONENT_TYPES.THUMBNAIL,
      media: {
        url: url,
      },
    };
    this.container.components.push(thumbnail);
    return this;
  }

  public addImage(url: string): this {
    const image: any = {
      type: COMPONENT_TYPES.IMAGE,
      items: [
        {
          media: {
            url: url,
          },
        },
      ],
    };
    this.container.components.push(image);
    return this;
  }

  public addButton(
    label: string,
    style: number,
    customId: string,
    emoji?: { id?: string; name: string; animated?: boolean }
  ): this {
    const button: any = {
      type: 2, // Button
      style: style,
      custom_id: customId,
    };

    if (label && label.trim()) {
      button.label = label.trim().slice(0, 80);
    }

    if (emoji) {
      button.emoji = emoji;
    }

    // Must have at least label or emoji
    if (!button.label && !button.emoji) {
      return this; // Skip adding invalid button
    }

    this.container.components.push(button);
    return this;
  }

  public addLinkButton(
    label: string,
    url: string,
    emoji?: { id?: string; name: string; animated?: boolean }
  ): this {
    const button: any = {
      type: 2, // Button
      style: 5, // Link style
      url: url,
    };

    if (label && label.trim()) {
      button.label = label.trim().slice(0, 80);
    }

    if (emoji) {
      button.emoji = emoji;
    }

    // Must have at least label or emoji
    if (!button.label && !button.emoji) {
      return this; // Skip adding invalid button
    }

    this.container.components.push(button);
    return this;
  }

  /**
   * Add an ActionRow containing buttons or select menu
   * This wraps components in type: 1 (ActionRow) as required by ComponentsV2
   */
  public addActionRow(components: any[]): this {
    const actionRow: any = {
      type: 1, // ActionRow
      components: components,
    };
    this.container.components.push(actionRow);
    return this;
  }

  /**
   * Create a button component (not added to container yet)
   * Use with addActionRow() to add multiple buttons in one row
   */
  public static createButton(
    label: string,
    style: number,
    customId: string,
    emoji?: { id?: string; name: string; animated?: boolean }
  ): any {
    const button: any = {
      type: 2, // Button
      style: style,
      custom_id: customId,
    };

    if (label && label.trim()) {
      button.label = label.trim().slice(0, 80);
    }

    if (emoji) {
      button.emoji = emoji;
    }

    return button;
  }

  /**
   * Create a select menu component (not added to container yet)
   * Use with addActionRow() to add a select menu
   */
  public static createSelectMenu(
    customId: string,
    placeholder: string,
    options: Array<{ label: string; value: string; emoji?: { name: string } }>
  ): any {
    return {
      type: 3, // String select menu
      custom_id: customId,
      placeholder: placeholder,
      min_values: 1,
      max_values: 1,
      options: options.map((opt) => ({
        label: opt.label,
        value: opt.value,
        emoji: opt.emoji,
      })),
    };
  }

  public toJSON(): DisplayComponentContainer {
    return this.container;
  }
}
