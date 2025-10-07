import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import { ComponentType, ButtonStyle } from 'discord-api-types/v10';
import type { MessageComponentInteraction, TextBasedChannel } from 'discord.js';
import { buildDisplay, dividerBlock, textBlock } from '../../../core/lib/componentsV2';

export const command: CommandMessage = {
  name: 'items-lista',
  type: 'message',
  aliases: ['lista-items', 'items-list'],
  cooldown: 5,
  description: 'Ver lista de todos los items del servidor',
  usage: 'items-lista [pagina]',
  run: async (message, args, client: Amayo) => {
    const guildId = message.guild!.id;
    const page = parseInt(args[0]) || 1;
    const perPage = 8;

    const total = await prisma.economyItem.count({
      where: { OR: [{ guildId }, { guildId: null }] }
    });

    const items = await prisma.economyItem.findMany({
      where: { OR: [{ guildId }, { guildId: null }] },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage
    });

    if (items.length === 0) {
      await message.reply('No hay items configurados en este servidor.');
      return;
    }

    const totalPages = Math.ceil(total / perPage);

    const displayBlocks = [
      textBlock(`# 🛠️ Lista de Items`),
      dividerBlock(),
      textBlock(`Página ${page}/${totalPages} • Total: ${total}`),
      dividerBlock({ divider: false, spacing: 2 }),
      ...items.flatMap((item, index) => {
        const lines = [
          `**${item.name || item.key}**`,
          `└ Key: \`${item.key}\``,
          `└ Categoría: ${item.category || '*Sin categoría*'}`,
          `└ ${item.stackable ? '📚 Apilable' : '🔒 No apilable'}${item.maxPerInventory ? ` (Máx: ${item.maxPerInventory})` : ''}${item.guildId === guildId ? ' • 📍 Local' : ' • 🌐 Global'}`,
        ].join('\n');

        const blocks = [textBlock(lines)];
        if (index < items.length - 1) {
          blocks.push(dividerBlock({ divider: false, spacing: 1 }));
        }
        return blocks;
      })
    ];

    const display = buildDisplay(0x00D9FF, displayBlocks);

    const buttons: any[] = [];
    
    if (page > 1) {
      buttons.push({
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: '◀ Anterior',
        custom_id: `items_prev_${page}`
      });
    }

    if (page < totalPages) {
      buttons.push({
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: 'Siguiente ▶',
        custom_id: `items_next_${page}`
      });
    }

    buttons.push({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      label: 'Ver Detalle',
      custom_id: 'items_detail'
    });

    const channel = message.channel as TextBasedChannel & { send: Function };
    const msg = await (channel.send as any)({
      content: null,
      flags: 32768,
      reply: { messageReference: message.id },
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

      if (i.customId.startsWith('items_prev_')) {
        const currentPage = parseInt(i.customId.split('_')[2]);
        await i.deferUpdate();
        args[0] = String(currentPage - 1);
        await command.run!(message, args, client);
        collector.stop();
      } else if (i.customId.startsWith('items_next_')) {
        const currentPage = parseInt(i.customId.split('_')[2]);
        await i.deferUpdate();
        args[0] = String(currentPage + 1);
        await command.run!(message, args, client);
        collector.stop();
      } else if (i.customId === 'items_detail') {
        await i.reply({
          content: '💡 Usa `!item-ver <key>` para ver detalles de un item específico.',
          flags: 64
        });
      }
    });
  }
};
