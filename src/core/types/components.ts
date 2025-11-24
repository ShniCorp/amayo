import type {
    ButtonInteraction,
    ModalSubmitInteraction,
    SelectMenuInteraction,
    ContextMenuCommandInteraction
} from "discord.js";
import type Amayo from "../client";


export interface Button {
    customId: string;
    run: (interaction: ButtonInteraction, client: Amayo) => Promise<unknown>;
}

export interface Modal {
    customId: string;
    run: (interaction: ModalSubmitInteraction, client: Amayo) => Promise<unknown>;
}

export interface SelectMenu {
    customId: string;
    run: (interaction: SelectMenuInteraction, client: Amayo) => Promise<unknown>;
}

export interface ContextMenu {
    name: string;
    type: 'USER' | 'MESSAGE';
    run: (interaction: ContextMenuCommandInteraction, client: Amayo) => Promise<unknown>;
}