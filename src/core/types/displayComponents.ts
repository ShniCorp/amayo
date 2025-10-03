import type { 
    ButtonStyle, 
    APIEmbed, 
    ComponentType
} from 'discord.js';

// Display Components V2 Types
export interface DisplayComponentContainer {
    type: 17; // Container type
    accent_color?: number;
    components: DisplayComponent[];
}

export interface DisplayComponentSection {
    type: 9; // Section type
    components: DisplayComponent[];
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

export type DisplayComponent = 
    | DisplayComponentContainer
    | DisplayComponentSection
    | DisplayComponentText
    | DisplayComponentSeparator
    | DisplayComponentThumbnail;

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

// Component constants for runtime use
export const COMPONENT_TYPES = {
    CONTAINER: 17,
    SECTION: 9,
    TEXT_DISPLAY: 10,
    SEPARATOR: 14,
    THUMBNAIL: 11,
    BUTTON: 2
} as const;
