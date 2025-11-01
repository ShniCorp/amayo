import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { applyMutationToInventory } from '../../../game/mutations/service';
import { fetchItemBasics, formatItemLabel } from './_helpers';

export const command: CommandMessage = {
  name: 'encantar',
  type: 'message',
  aliases: ['mutar','enchant'],
  cooldown: 3,
  description: 'Aplica una mutación/encantamiento a un ítem por su itemKey y mutationKey, respetando mutationPolicy.',
  usage: 'encantar <itemKey> <mutationKey>',
  run: async (message, args, _client: Amayo) => {
    const itemKey = args[0]?.trim();
    const mutationKey = args[1]?.trim();
    if (!itemKey || !mutationKey) { await message.reply('Uso: `!encantar <itemKey> <mutationKey>`'); return; }
    const guildId = message.guild!.id;
    const userId = message.author.id;
    let itemInfo: { key: string; name: string | null; icon: string | null } = { key: itemKey, name: null, icon: null };
    try {
      const basics = await fetchItemBasics(guildId, [itemKey]);
      itemInfo = basics.get(itemKey) ?? itemInfo;

      await applyMutationToInventory(userId, guildId, itemKey, mutationKey);
      const label = formatItemLabel(itemInfo, { bold: true });
      await message.reply(`✨ Aplicada mutación \`${mutationKey}\` a ${label}.`);
    } catch (e: any) {
      const label = formatItemLabel(itemInfo, { bold: true });
      await message.reply(`❌ No se pudo encantar ${label}: ${e?.message ?? e}`);
    }
  }
};

