import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { applyMutationToInventory } from '../../../game/mutations/service';

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
    try {
      await applyMutationToInventory(message.author.id, message.guild!.id, itemKey, mutationKey);
      await message.reply(`✨ Aplicada mutación ${mutationKey} a ${itemKey}.`);
    } catch (e: any) {
      await message.reply(`❌ No se pudo encantar: ${e?.message ?? e}`);
    }
  }
};

