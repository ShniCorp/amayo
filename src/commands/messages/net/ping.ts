import {CommandMessage} from "../../../core/types/commands";

export const command: CommandMessage = {
    name: 'ping',
    type: "message",
    aliases: ['latency', 'pong'],
    cooldown: 5,
    run: async (message, args) => {
        await message.reply('pong!')
    }
}