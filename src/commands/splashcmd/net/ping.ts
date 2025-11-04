import {CommandSlash} from "../../../core/types/commands";


export const command: CommandSlash = {
    name: 'ping',
    description: 'Ping',
    type: "slash",
    cooldown: 10,
    run: async (interaction, client) => {
        await interaction.reply('pong!')
    }
}
