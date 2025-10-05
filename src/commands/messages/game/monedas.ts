import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { getOrCreateWallet } from '../../../game/economy/service';

export const command: CommandMessage = {
  name: 'monedas',
  type: 'message',
  aliases: ['coins','saldo'],
  cooldown: 2,
  description: 'Muestra tu saldo de monedas en este servidor.',
  usage: 'monedas',
  run: async (message, _args, _client: Amayo) => {
    const wallet = await getOrCreateWallet(message.author.id, message.guild!.id);
    await message.reply(`💰 Monedas: ${wallet.coins}`);
  }
};

