import type {ChatInputCommandInteraction, Client, Message} from "discord.js";
import Amayo from "../client";

export interface CommandMessage {
    name: string;
    type: 'message';
    aliases?: string[];
    cooldown?: number;
    run: (message: Message, args: string[], client: Amayo) => Promise<void>;
}

export interface CommandSlash {
    name: string;
    description: string;
    type: 'slash';
    options?: string[];
    cooldown?: number;
    run: (i: ChatInputCommandInteraction, client: Client) => Promise<void>;
}