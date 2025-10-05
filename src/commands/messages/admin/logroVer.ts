import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import type { TextBasedChannel } from 'discord.js';
import { ComponentType, ButtonStyle } from 'discord-api-types/v10';

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

    const display = {
      type: 17,
      accent_color: 0xFFD700,
      components: [
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `${achievement.icon || '🏆'} **${achievement.name}**`
            }
          ]
        },
        { type: 14, divider: true },
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `**Descripción:** ${achievement.description}\n` +
                       `**Key:** \`${achievement.key}\`\n` +
                       `**Categoría:** ${achievement.category}\n` +
                       `**Puntos:** ${achievement.points} pts\n` +
                       `**Visibilidad:** ${achievement.hidden ? '🔒 Oculto' : '👁️ Visible'}\n` +
                       `**Ámbito:** ${achievement.guildId ? '📍 Local del servidor' : '🌐 Global'}\n` +
                       `**Desbloqueados:** ${unlockedCount} jugadores`
            }
          ]
        },
        { type: 14, divider: true },
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `**📋 Requisitos:**\n\`\`\`json\n${JSON.stringify(req, null, 2)}\n\`\`\``
            }
          ]
        },
        { type: 14, divider: true },
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `**🎁 Recompensas:**\n\`\`\`json\n${JSON.stringify(rew, null, 2)}\n\`\`\``
            }
          ]
        }
      ]
    };

    if (achievement.unlocked.length > 0) {
      display.components.push({ type: 14, divider: true });
      display.components.push({
        type: 9,
        components: [
          {
            type: 10,
            content: `**🏆 Últimos Desbloqueados:**\n` +
                     achievement.unlocked.slice(0, 5).map(pa => 
                       `• <@${pa.userId}> - ${pa.unlockedAt ? new Date(pa.unlockedAt).toLocaleDateString() : 'N/A'}`
                     ).join('\n')
          }
        ]
      });
    }

    const channel = message.channel as TextBasedChannel & { send: Function }; await (channel.send as any)({ display, reply: { messageReference: message.id } });
  }
};
