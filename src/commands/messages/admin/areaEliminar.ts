import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import { prisma } from '../../../core/database/prisma';

export const command: CommandMessage = {
  name: 'area-eliminar',
  type: 'message',
  aliases: ['eliminar-area', 'area-delete'],
  cooldown: 5,
  description: 'Eliminar un área del servidor',
  usage: 'area-eliminar <key>',
  run: async (message, args, client: Amayo) => {
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, prisma);
    if (!allowed) {
      await message.reply('❌ No tienes permisos de ManageGuild ni rol de staff.');
      return;
    }

    const guildId = message.guild!.id;
    const key = args[0]?.trim();

    if (!key) {
      await message.reply('Uso: \`!area-eliminar <key>\`\nEjemplo: \`!area-eliminar mine.cavern\`');
      return;
    }

    const area = await prisma.gameArea.findFirst({
      where: { key, guildId }
    });

    if (!area) {
      await message.reply(`❌ No se encontró el área local con key ${key} en este servidor.`);
      return;
    }

    const levelsCount = await prisma.gameAreaLevel.count({
      where: { areaId: area.id }
    });

    if (levelsCount > 0) {
      await prisma.gameAreaLevel.deleteMany({
        where: { areaId: area.id }
      });
    }

    await prisma.gameArea.delete({
      where: { id: area.id }
    });

    await message.reply(
      `✅ Área ${key} eliminada exitosamente.\n` +
      `${levelsCount > 0 ? `⚠️ Se eliminaron ${levelsCount} nivel(es) asociado(s).` : ''}`
    );
  }
};
