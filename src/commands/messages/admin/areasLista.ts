import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import { ComponentType, ButtonStyle } from 'discord-api-types/v10';
import type { MessageComponentInteraction, TextBasedChannel } from 'discord.js';

export const command: CommandMessage = {
  name: 'areas-lista',
  type: 'message',
  aliases: ['lista-areas', 'areas-list'],
  cooldown: 5,
  description: 'Ver lista de todas las áreas del servidor',
  usage: 'areas-lista [pagina]',
  run: async (message, args, client: Amayo) => {
    const guildId = message.guild!.id;
    const page = parseInt(args[0]) || 1;
    const perPage = 6;

    const total = await prisma.gameArea.count({
      where: { OR: [{ guildId }, { guildId: null }] }
    });

    const areas = await prisma.gameArea.findMany({
      where: { OR: [{ guildId }, { guildId: null }] },
      orderBy: [{ key: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage
    });

    if (areas.length === 0) {
      await message.reply('No hay áreas configuradas en este servidor.');
      return;
    }

    const totalPages = Math.ceil(total / perPage);

    const display = {
      type: 17,
      accent_color: 0x00FF00,
      components: [
        {
          type: 9,
          components: [{
            type: 10,
            content: `**🗺️ Lista de Áreas**\nPágina ${page}/${totalPages} • Total: ${total}`
          }]
        },
        { type: 14, divider: true },
        ...areas.map(area => ({
          type: 9,
          components: [{
            type: 10,
            content: `**${area.name || area.key}**\n` +
                     `└ Key: \`${area.key}\`\n` +
                     `└ ${area.guildId === guildId ? '📍 Local' : '🌐 Global'}`
          }]
        }))
      ]
    };

    const buttons: any[] = [];
    
    if (page > 1) {
      buttons.push({
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: '◀ Anterior',
        custom_id: `areas_prev_${page}`
      });
    }

    if (page < totalPages) {
      buttons.push({
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: 'Siguiente ▶',
        custom_id: `areas_next_${page}`
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

      if (i.customId.startsWith('areas_prev_')) {
        const currentPage = parseInt(i.customId.split('_')[2]);
        await i.deferUpdate();
        args[0] = String(currentPage - 1);
        await command.run!(message, args, client);
        collector.stop();
      } else if (i.customId.startsWith('areas_next_')) {
        const currentPage = parseInt(i.customId.split('_')[2]);
        await i.deferUpdate();
        args[0] = String(currentPage + 1);
        await command.run!(message, args, client);
        collector.stop();
      }
    });
  }
};
