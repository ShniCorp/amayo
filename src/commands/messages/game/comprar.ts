import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { buyFromOffer } from '../../../game/economy/service';

export const command: CommandMessage = {
  name: 'comprar',
  type: 'message',
  aliases: ['buy'],
  cooldown: 3,
  description: 'Compra una oferta de la tienda por su ID. Respeta límites y stock.',
  usage: 'comprar <offerId> [qty] (ej: comprar off_123 2)',
  run: async (message, args, _client: Amayo) => {
    const offerId = args[0]?.trim();
    const qty = Math.max(1, parseInt(args[1] || '1', 10) || 1);
    if (!offerId) { await message.reply('Uso: `!comprar <offerId> [qty]`'); return; }
    try {
      const res = await buyFromOffer(message.author.id, message.guild!.id, offerId, qty);
      await message.reply(`🛒 Comprado: ${res.item.key} x${res.qty}`);
    } catch (e: any) {
      await message.reply(`❌ No se pudo comprar: ${e?.message ?? e}`);
    }
  }
};

