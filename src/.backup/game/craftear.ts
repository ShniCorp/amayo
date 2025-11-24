import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { craftByProductKey } from '../../../game/economy/service';
import { fetchItemBasics, formatItemLabel } from './_helpers';

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

    const guildId = message.guild!.id;
    const userId = message.author.id;
    let itemInfo: { key: string; name: string | null; icon: string | null } = { key: productKey, name: null, icon: null };
    try {
      const basics = await fetchItemBasics(guildId, [productKey]);
      itemInfo = basics.get(productKey) ?? itemInfo;
    } catch (err) {
      console.error('No se pudo resolver info de item para craftear', err);
    }

    let crafted = 0;
    let lastError: any = null;
    for (let i = 0; i < times; i++) {
      try {
        const res = await craftByProductKey(userId, guildId, productKey);
        crafted += res.added;
        itemInfo = { key: res.product.key, name: res.product.name, icon: res.product.icon };
      } catch (e: any) {
        lastError = e; break;
      }
    }

    const label = formatItemLabel(itemInfo, { bold: true });
    if (crafted > 0) {
      await message.reply(`🛠️ Crafteado ${label} x${crafted}.`);
    } else {
      await message.reply(`❌ No se pudo craftear ${label}: ${lastError?.message ?? 'revise ingredientes/receta'}`);
    }
  }
};

