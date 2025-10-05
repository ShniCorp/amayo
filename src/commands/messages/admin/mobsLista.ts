import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import { ComponentType, ButtonStyle } from 'discord-api-types/v10';
import type { MessageComponentInteraction, TextBasedChannel } from 'discord.js';

export const command: CommandMessage = {
  name: 'mobs-lista',
  type: 'message',
  aliases: ['lista-mobs', 'mobs-list'],
  cooldown: 5,
  description: 'Ver lista de todos los mobs del servidor',
  usage: 'mobs-lista [pagina]',
  run: async (message, args, client: Amayo) => {
    const guildId = message.guild!.id;
    const page = parseInt(args[0]) || 1;
    const perPage = 6;

    const total = await prisma.mob.count({
      where: { OR: [{ guildId }, { guildId: null }] }
    });

    const mobs = await prisma.mob.findMany({
      where: { OR: [{ guildId }, { guildId: null }] },
      orderBy: [{ key: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage
    });

    if (mobs.length === 0) {
      await message.reply('No hay mobs configurados en este servidor.');
      return;
    }

    const totalPages = Math.ceil(total / perPage);

    const display = {
      type: 17,
      accent_color: 0xFF0000,
      components: [
        {
          type: 9,
          components: [{
            type: 10,
            content: `**👾 Lista de Mobs**\nPágina ${page}/${totalPages} • Total: ${total}`
          }]
        },
        { type: 14, divider: true },
        ...mobs.map(mob => {
          const stats = mob.stats as any || {};
          return {
            type: 9,
            components: [{
              type: 10,
              content: `**${mob.name || mob.key}**\n` +
                       `└ Key: \`${mob.key}\`\n` +
                       `└ ATK: ${stats.attack || 0} | HP: ${stats.hp || 0}\n` +
                       `└ ${mob.guildId === guildId ? '📍 Local' : '🌐 Global'}`
            }]
          };
        })
      ]
    };

    const buttons: any[] = [];
    
    if (page > 1) {
      buttons.push({
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: '◀ Anterior',
        custom_id: `mobs_prev_${page}`
      });
    }

    if (page < totalPages) {
      buttons.push({
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: 'Siguiente ▶',
        custom_id: `mobs_next_${page}`
      });
    }

    const channel = message.channel as TextBasedChannel & { send: Function };
    const msg = await (channel.send as any)({
      flags: 32768,
      components: [
        display,
        ...(buttons.length > 0 ? [{
          type: ComponentType.ActionRow,
          components: buttons
        }] : [])
      ]
    });

    const collector = msg.createMessageComponentCollector({
      time: 5 * 60_000,
      filter: (i) => i.user.id === message.author.id
    });

    collector.on('collect', async (i: MessageComponentInteraction) => {
      if (!i.isButton()) return;

      if (i.customId.startsWith('mobs_prev_')) {
        const currentPage = parseInt(i.customId.split('_')[2]);
        await i.deferUpdate();
        args[0] = String(currentPage - 1);
        await command.run!(message, args, client);
        collector.stop();
      } else if (i.customId.startsWith('mobs_next_')) {
        const currentPage = parseInt(i.customId.split('_')[2]);
        await i.deferUpdate();
        args[0] = String(currentPage + 1);
        await command.run!(message, args, client);
        collector.stop();
      }
    });
  }
};
