import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { useConsumableByKey } from '../../../game/consumables/service';
import { fetchItemBasics, formatItemLabel } from './_helpers';

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
    const guildId = message.guild!.id;
    const userId = message.author.id;
    let itemInfo: { key: string; name: string | null; icon: string | null } = { key: itemKey, name: null, icon: null };
    try {
      const basics = await fetchItemBasics(guildId, [itemKey]);
      itemInfo = basics.get(itemKey) ?? itemInfo;

      const res = await useConsumableByKey(userId, guildId, itemKey);
      const label = formatItemLabel(itemInfo, { bold: true });
      await message.reply(`🍽️ Usaste ${label}. Curado: +${res.healed} HP.`);
    } catch (e: any) {
      const label = formatItemLabel(itemInfo, { bold: true });
      await message.reply(`❌ No se pudo usar ${label}: ${e?.message ?? e}`);
    }
  }
};

