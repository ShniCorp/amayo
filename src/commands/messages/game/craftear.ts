import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { craftByProductKey } from '../../../game/economy/service';

export const command: CommandMessage = {
  name: 'craftear',
  type: 'message',
  aliases: ['craft'],
  cooldown: 3,
  description: 'Craftea un ítem por su productKey, consumiendo ingredientes según la receta.',
  usage: 'craftear <productKey> [veces] (ej: craftear ingot.iron 3)',
  run: async (message, args, _client: Amayo) => {
    const productKey = args[0]?.trim();
    const times = Math.max(1, parseInt(args[1] || '1', 10) || 1);
    if (!productKey) { await message.reply('Uso: `!craftear <productKey> [veces]`'); return; }

    let crafted = 0;
    let lastError: any = null;
    for (let i = 0; i < times; i++) {
      try {
        const res = await craftByProductKey(message.author.id, message.guild!.id, productKey);
        crafted += res.added;
      } catch (e: any) {
        lastError = e; break;
      }
    }

    if (crafted > 0) {
      await message.reply(`🛠️ Crafteado ${productKey} x${crafted * 1}.`);
    } else {
      await message.reply(`❌ No se pudo craftear: ${lastError?.message ?? 'revise ingredientes/receta'}`);
    }
  }
};

