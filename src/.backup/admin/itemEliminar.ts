import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import { prisma } from '../../../core/database/prisma';

export const command: CommandMessage = {
  name: 'item-eliminar',
  type: 'message',
  aliases: ['eliminar-item', 'item-delete'],
  cooldown: 5,
  description: 'Eliminar un item del servidor',
  usage: 'item-eliminar <key>',
  run: async (message, args, client: Amayo) => {
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, prisma);
    if (!allowed) {
      await message.reply('❌ No tienes permisos de ManageGuild ni rol de staff.');
      return;
    }

    const guildId = message.guild!.id;
    const key = args[0]?.trim();

    if (!key) {
      await message.reply('Uso: `!item-eliminar <key>`\nEjemplo: `!item-eliminar tool.pickaxe.iron`');
      return;
    }

    const item = await prisma.economyItem.findFirst({
      where: { key, guildId }
    });

    if (!item) {
      await message.reply(`❌ No se encontró el item local con key \`${key}\` en este servidor.\n` +
                         `💡 Solo puedes eliminar items locales del servidor, no globales.`);
      return;
    }

    // Verificar si está en uso
    const inInventory = await prisma.inventoryEntry.count({
      where: { itemId: item.id, quantity: { gt: 0 } }
    });

    const inOffers = await prisma.shopOffer.count({
      where: { itemId: item.id }
    });

    if (inInventory > 0 || inOffers > 0) {
      await message.reply(
        `⚠️ **Advertencia:** Este item está en uso:\n` +
        `${inInventory > 0 ? `• En ${inInventory} inventario(s)\n` : ''}` +
        `${inOffers > 0 ? `• En ${inOffers} oferta(s) de tienda\n` : ''}` +
        `¿Estás seguro? Usa \`!item-eliminar-forzar ${key}\` para confirmar.`
      );
      return;
    }

    // Eliminar el item
    await prisma.economyItem.delete({
      where: { id: item.id }
    });

    await message.reply(`✅ Item \`${key}\` eliminado exitosamente.`);
  }
};
