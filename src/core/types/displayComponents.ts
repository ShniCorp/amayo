import type { ButtonStyle, APIEmbed, ComponentType } from "discord.js";

// Display Components V2 Types
export const COMPONENT_TYPES = {
  CONTAINER: 17,
  SECTION: 9,
  TEXT_DISPLAY: 10,
  SEPARATOR: 14,
  THUMBNAIL: 11,
  IMAGE: 12,
  BUTTON: 2,
} as const;

export interface DisplayComponentContainer {
  type: 17; // Container type
  accent_color?: number;
  components: DisplayComponentNonContainer[];
}

export interface DisplayComponentSection {
  type: 9; // Section type
  components: DisplayComponentText[]; // Sections can only contain text components
  accessory?: DisplayComponentAccessory;
}

export interface DisplayComponentText {
  type: 10; // TextDisplay type
  content: string;
}

export interface DisplayComponentSeparator {
  type: 14; // Separator type
  divider?: boolean;
  spacing?: number;
}

export interface DisplayComponentThumbnail {
  type: 11; // Thumbnail type
  media: {
    url: string;
  };
}

export interface DisplayComponentButton {
  type: 2; // Button type
  style: ButtonStyle;
  label: string;
  custom_id?: string;
  url?: string;
  emoji?: {
    name: string;
    id?: string;
  };
  disabled?: boolean;
}

export interface DisplayComponentImage {
  type: 12; // Image type
  items: {
    media: {
      url: string;
    };
  }[];
}

// Components that can be nested inside containers (excludes containers themselves)
export type DisplayComponentNonContainer =
  | DisplayComponentSection
  | DisplayComponentText
  | DisplayComponentSeparator
  | DisplayComponentThumbnail
  | DisplayComponentImage
  | { type: 1; components: any[] }; // ActionRow

// Top-level component union (includes containers)
export type DisplayComponent =
  | DisplayComponentContainer
  | DisplayComponentNonContainer;

export type DisplayComponentAccessory =
  | DisplayComponentButton
  | DisplayComponentThumbnail;

// Block configuration types - compatible with Prisma JsonValue
export interface BlockConfig {
  components?: any[]; // Use any[] to be compatible with JsonValue
  coverImage?: string;
  version?: string;
}

export interface Block {
  id: string;
  name: string;
  guildId: string;
  config: BlockConfig;
  createdAt?: Date;
  updatedAt?: Date;
}

// Pagination helpers
export interface PaginationData<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
}

export interface PaginationControls {
  hasPrevious: boolean;
  hasNext: boolean;
  currentPage: number;
  totalPages: number;
}
