import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { setEquipmentSlot } from '../../../game/combat/equipmentService';
import { prisma } from '../../../core/database/prisma';

export const command: CommandMessage = {
  name: 'equipar',
  type: 'message',
  aliases: ['equip'],
  cooldown: 3,
  description: 'Equipa un item en un slot (weapon|armor|cape) por su key, si lo tienes en inventario.',
  usage: 'equipar <weapon|armor|cape> <itemKey>',
  run: async (message, args, _client: Amayo) => {
    const slot = (args[0]?.trim()?.toLowerCase() as 'weapon'|'armor'|'cape'|undefined);
    const itemKey = args[1]?.trim();
    if (!slot || !['weapon','armor','cape'].includes(slot) || !itemKey) {
      await message.reply('Uso: `!equipar <weapon|armor|cape> <itemKey>`');
      return;
    }
    const guildId = message.guild!.id;
    const userId = message.author.id;

    const item = await prisma.economyItem.findFirst({ where: { key: itemKey, OR: [{ guildId }, { guildId: null }] }, orderBy: [{ guildId: 'desc' }] });
    if (!item) { await message.reply('❌ Item no encontrado.'); return; }
    const inv = await prisma.inventoryEntry.findUnique({ where: { userId_guildId_itemId: { userId, guildId, itemId: item.id } } });
    if (!inv || inv.quantity <= 0) { await message.reply('❌ No tienes este item en tu inventario.'); return; }

    await setEquipmentSlot(userId, guildId, slot, item.id);
    await message.reply(`🧰 Equipado en ${slot}: ${item.key}`);
  }
};

