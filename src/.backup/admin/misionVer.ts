import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import type { TextBasedChannel } from 'discord.js';

export const command: CommandMessage = {
  name: 'mision-ver',
  type: 'message',
  aliases: ['ver-mision', 'quest-view'],
  cooldown: 3,
  description: 'Ver detalles de una misión específica',
  usage: 'mision-ver <key>',
  run: async (message, args, client: Amayo) => {
    const guildId = message.guild!.id;
    const key = args[0]?.trim();

    if (!key) {
      await message.reply('Uso: `!mision-ver <key>`\nEjemplo: `!mision-ver daily_mine`');
      return;
    }

    const quest = await prisma.quest.findFirst({
      where: {
        key,
        OR: [{ guildId }, { guildId: null }]
      },
      include: {
        progress: {
          take: 10,
          orderBy: { completedAt: 'desc' },
          where: { completed: true }
        }
      }
    });

    if (!quest) {
      await message.reply(`❌ No se encontró la misión con key \`${key}\``);
      return;
    }

    const completedCount = await prisma.questProgress.count({
      where: {
        questId: quest.id,
        guildId,
        completed: true
      }
    });

    const claimedCount = await prisma.questProgress.count({
      where: {
        questId: quest.id,
        guildId,
        claimed: true
      }
    });

    const req = quest.requirements as any;
    const rew = quest.rewards as any;

    const typeEmojis: Record<string, string> = {
      daily: '📅 Diaria',
      weekly: '📆 Semanal',
      permanent: '♾️ Permanente',
      event: '🎉 Evento'
    };

    const display = {
      type: 17,
      accent_color: 0x5865F2,
      components: [
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `${quest.icon || '📋'} **${quest.name}**`
            }
          ]
        },
        { type: 14, divider: true },
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `**Descripción:** ${quest.description}\n` +
                       `**Key:** \`${quest.key}\`\n` +
                       `**Tipo:** ${typeEmojis[quest.type] || quest.type}\n` +
                       `**Categoría:** ${quest.category}\n` +
                       `**Estado:** ${quest.active ? '✅ Activa' : '❌ Inactiva'}\n` +
                       `**Repetible:** ${quest.repeatable ? '🔄 Sí' : '1️⃣ No'}\n` +
                       `**Ámbito:** ${quest.guildId ? '📍 Local del servidor' : '🌐 Global'}\n` +
                       `**Completadas:** ${completedCount} veces\n` +
                       `**Recompensas reclamadas:** ${claimedCount} veces`
            }
          ]
        }
      ]
    };

    if (quest.startAt || quest.endAt) {
      display.components.push({ type: 14, divider: true });
      display.components.push({
        type: 9,
        components: [
          {
            type: 10,
            content: `**⏰ Disponibilidad:**\n` +
                     (quest.startAt ? `Inicio: ${new Date(quest.startAt).toLocaleString()}\n` : '') +
                     (quest.endAt ? `Fin: ${new Date(quest.endAt).toLocaleString()}` : 'Sin fecha de fin')
          }
        ]
      });
    }

    display.components.push({ type: 14, divider: true });
    display.components.push({
      type: 9,
      components: [
        {
          type: 10,
          content: `**📋 Requisitos:**\n\`\`\`json\n${JSON.stringify(req, null, 2)}\n\`\`\``
        }
      ]
    });

    display.components.push({ type: 14, divider: true });
    display.components.push({
      type: 9,
      components: [
        {
          type: 10,
          content: `**🎁 Recompensas:**\n\`\`\`json\n${JSON.stringify(rew, null, 2)}\n\`\`\``
        }
      ]
    });

    if (quest.progress.length > 0) {
      display.components.push({ type: 14, divider: true });
      display.components.push({
        type: 9,
        components: [
          {
            type: 10,
            content: `**✅ Últimas Completaciones:**\n` +
                     quest.progress.slice(0, 5).map(qp => 
                       `• <@${qp.userId}> - ${qp.completedAt ? new Date(qp.completedAt).toLocaleDateString() : 'N/A'} ${qp.claimed ? '🎁' : ''}`
                     ).join('\n')
          }
        ]
      });
    }

    const channel = message.channel as TextBasedChannel & { send: Function }; await (channel.send as any)({ flags: 32768, components: [display] });
  }
};
