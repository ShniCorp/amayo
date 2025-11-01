import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import type { TextBasedChannel } from 'discord.js';
import { buildDisplay, dividerBlock, textBlock } from '../../../core/lib/componentsV2';

export const command: CommandMessage = {
  name: 'logro-ver',
  type: 'message',
  aliases: ['ver-logro', 'achievement-view'],
  cooldown: 3,
  description: 'Ver detalles de un logro específico',
  usage: 'logro-ver <key>',
  run: async (message, args, client: Amayo) => {
    const guildId = message.guild!.id;
    const key = args[0]?.trim();

    if (!key) {
      await message.reply('Uso: `!logro-ver <key>`\nEjemplo: `!logro-ver first_mine`');
      return;
    }

    const achievement = await prisma.achievement.findFirst({
      where: {
        key,
        OR: [{ guildId }, { guildId: null }]
      },
      include: {
        unlocked: {
          take: 10,
          orderBy: { unlockedAt: 'desc' },
          where: { unlockedAt: { not: null } }
        }
      }
    });

    if (!achievement) {
      await message.reply(`❌ No se encontró el logro con key \`${key}\``);
      return;
    }

    const unlockedCount = await prisma.playerAchievement.count({
      where: {
        achievementId: achievement.id,
        guildId,
        unlockedAt: { not: null }
      }
    });

    const req = achievement.requirements as any;
    const rew = achievement.rewards as any;

    const blocks = [
      textBlock(`${achievement.icon || '🏆'} **${achievement.name}**`),
      dividerBlock(),
      textBlock([
        `**Descripción:** ${achievement.description}`,
        `**Key:** \`${achievement.key}\``,
        `**Categoría:** ${achievement.category}`,
        `**Puntos:** ${achievement.points} pts`,
        `**Visibilidad:** ${achievement.hidden ? '🔒 Oculto' : '👁️ Visible'}`,
        `**Ámbito:** ${achievement.guildId ? '📍 Local del servidor' : '🌐 Global'}`,
        `**Desbloqueados:** ${unlockedCount} jugadores`,
      ].join('\n')),
      dividerBlock(),
      textBlock(`**📋 Requisitos:**\n\`\`\`json\n${JSON.stringify(req, null, 2)}\n\`\`\``),
      dividerBlock(),
      textBlock(`**🎁 Recompensas:**\n\`\`\`json\n${JSON.stringify(rew, null, 2)}\n\`\`\``),
    ];

    if (achievement.unlocked.length > 0) {
      const unlockedLines = achievement.unlocked.slice(0, 5)
        .map(pa => `• <@${pa.userId}> - ${pa.unlockedAt ? new Date(pa.unlockedAt).toLocaleDateString() : 'N/A'}`)
        .join('\n');
      blocks.push(dividerBlock());
      blocks.push(textBlock(`**🏆 Últimos Desbloqueados:**\n${unlockedLines}`));
    }

    const display = buildDisplay(0xFFD700, blocks);

    const channel = message.channel as TextBasedChannel & { send: Function };
    await (channel.send as any)({
      content: null,
      flags: 32768,
      components: [display],
      reply: { messageReference: message.id }
    });
  }
};
