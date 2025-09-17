import type {ButtonInteraction} from "discord.js";


export interface button {
    customId: string;
    run: (interaction: ButtonInteraction) => Promise<void>;
}