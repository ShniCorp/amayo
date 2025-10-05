import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { useConsumableByKey } from '../../../game/consumables/service';

export const command: CommandMessage = {
  name: 'comer',
  type: 'message',
  aliases: ['usar-comida','usar'],
  cooldown: 3,
  description: 'Usa un ítem consumible (comida/poción) para curarte. Respeta cooldowns.',
  usage: 'comer <itemKey>',
  run: async (message, args, _client: Amayo) => {
    const itemKey = args[0]?.trim();
    if (!itemKey) { await message.reply('Uso: `!comer <itemKey>`'); return; }
    try {
      const res = await useConsumableByKey(message.author.id, message.guild!.id, itemKey);
      await message.reply(`🍽️ Usaste ${itemKey}. Curado: +${res.healed} HP.`);
    } catch (e: any) {
      await message.reply(`❌ No se pudo usar ${itemKey}: ${e?.message ?? e}`);
    }
  }
};

