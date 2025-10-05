import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import { prisma } from '../../../core/database/prisma';

export const command: CommandMessage = {
  name: 'logro-eliminar',
  type: 'message',
  aliases: ['eliminar-logro', 'achievement-delete'],
  cooldown: 5,
  description: 'Eliminar un logro del servidor',
  usage: 'logro-eliminar <key>',
  run: async (message, args, client: Amayo) => {
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, prisma);
    if (!allowed) {
      await message.reply('❌ No tienes permisos de ManageGuild ni rol de staff.');
      return;
    }

    const guildId = message.guild!.id;
    const key = args[0]?.trim();

    if (!key) {
      await message.reply('Uso: `!logro-eliminar <key>`\nEjemplo: `!logro-eliminar test_achievement`');
      return;
    }

    const achievement = await prisma.achievement.findFirst({
      where: { key, guildId }
    });

    if (!achievement) {
      await message.reply(`❌ No se encontró el logro local con key \`${key}\` en este servidor.\n` +
                         `💡 Solo puedes eliminar logros locales del servidor, no globales.`);
      return;
    }

    // Contar cuántos jugadores lo han desbloqueado
    const unlockedCount = await prisma.playerAchievement.count({
      where: {
        achievementId: achievement.id,
        unlockedAt: { not: null }
      }
    });

    // Eliminar progreso de jugadores primero
    await prisma.playerAchievement.deleteMany({
      where: { achievementId: achievement.id }
    });

    // Eliminar el logro
    await prisma.achievement.delete({
      where: { id: achievement.id }
    });

    await message.reply(
      `✅ Logro \`${key}\` eliminado exitosamente.\n` +
      `${unlockedCount > 0 ? `⚠️ Se eliminó el progreso de ${unlockedCount} jugador(es).` : ''}`
    );
  }
};
