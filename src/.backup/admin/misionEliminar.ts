import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import { prisma } from '../../../core/database/prisma';

export const command: CommandMessage = {
  name: 'mision-eliminar',
  type: 'message',
  aliases: ['eliminar-mision', 'quest-delete'],
  cooldown: 5,
  description: 'Eliminar una misión del servidor',
  usage: 'mision-eliminar <key>',
  run: async (message, args, client: Amayo) => {
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, prisma);
    if (!allowed) {
      await message.reply('❌ No tienes permisos de ManageGuild ni rol de staff.');
      return;
    }

    const guildId = message.guild!.id;
    const key = args[0]?.trim();

    if (!key) {
      await message.reply('Uso: `!mision-eliminar <key>`\nEjemplo: `!mision-eliminar daily_mine`');
      return;
    }

    const quest = await prisma.quest.findFirst({
      where: { key, guildId }
    });

    if (!quest) {
      await message.reply(`❌ No se encontró la misión local con key \`${key}\` en este servidor.\n` +
                         `💡 Solo puedes eliminar misiones locales del servidor, no globales.`);
      return;
    }

    // Contar cuántos progresos existen
    const progressCount = await prisma.questProgress.count({
      where: { questId: quest.id }
    });

    // Eliminar progreso de jugadores primero
    await prisma.questProgress.deleteMany({
      where: { questId: quest.id }
    });

    // Eliminar la misión
    await prisma.quest.delete({
      where: { id: quest.id }
    });

    await message.reply(
      `✅ Misión \`${key}\` eliminada exitosamente.\n` +
      `${progressCount > 0 ? `⚠️ Se eliminó el progreso de ${progressCount} registro(s).` : ''}`
    );
  }
};
