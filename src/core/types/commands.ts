import type {ChatInputCommandInteraction, Message} from "discord.js";
import type Amayo from "../client";

export interface CommandMessage {
    name: string;
    type: 'message';
    aliases?: string[];
    cooldown?: number;
    // New optional metadata for auto-help
    description?: string;
    category?: string;
    usage?: string;
    run: (message: Message, args: string[], client: Amayo) => Promise<void>;
}

export interface CommandSlash {
    name: string;
    description: string;
    type: 'slash';
    options?: any[];
    cooldown?: number;
    run: (i: ChatInputCommandInteraction, client: Amayo) => Promise<void>;
}