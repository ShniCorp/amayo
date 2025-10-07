import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import type { TextBasedChannel } from 'discord.js';
import { buildDisplay, dividerBlock, textBlock } from '../../../core/lib/componentsV2';

export const command: CommandMessage = {
  name: 'item-ver',
  type: 'message',
  aliases: ['ver-item', 'item-view'],
  cooldown: 3,
  description: 'Ver detalles de un item específico',
  usage: 'item-ver <key>',
  run: async (message, args, client: Amayo) => {
    const guildId = message.guild!.id;
    const key = args[0]?.trim();

    if (!key) {
      await message.reply('Uso: `!item-ver <key>`\nEjemplo: `!item-ver tool.pickaxe.iron`');
      return;
    }

    const item = await prisma.economyItem.findFirst({
      where: {
        key,
        OR: [{ guildId }, { guildId: null }]
      }
    });

    if (!item) {
      await message.reply(`❌ No se encontró el item con key \`${key}\``);
      return;
    }

    const props = item.props as any || {};
    const tags = item.tags || [];

    const blocks = [
      textBlock(`# 🛠️ ${item.name || item.key}`),
      dividerBlock(),
      textBlock([
        `**Key:** \`${item.key}\``,
        `**Nombre:** ${item.name || '*Sin nombre*'}`,
        `**Descripción:** ${item.description || '*Sin descripción*'}`,
        `**Categoría:** ${item.category || '*Sin categoría*'}`,
        `**Stackable:** ${item.stackable ? 'Sí' : 'No'}`,
        `**Máx. Inventario:** ${item.maxPerInventory ?? 'Ilimitado'}`,
        `**Ámbito:** ${item.guildId ? '📍 Local del servidor' : '🌐 Global'}`,
      ].join('\n')),
    ];

    if (tags.length > 0) {
      blocks.push(dividerBlock());
      blocks.push(textBlock(`**Tags:** ${tags.join(', ')}`));
    }

    if (item.icon) {
      blocks.push(dividerBlock());
      blocks.push(textBlock(`**Icon URL:** ${item.icon}`));
    }

    if (Object.keys(props).length > 0) {
      blocks.push(dividerBlock());
      blocks.push(textBlock(`**Props (JSON):**\n\`\`\`json\n${JSON.stringify(props, null, 2)}\n\`\`\``));
    }

    const display = buildDisplay(0x00D9FF, blocks);

    const channel = message.channel as TextBasedChannel & { send: Function };
    await (channel.send as any)({
      content: null,
      flags: 32768,
      components: [display],
      reply: { messageReference: message.id }
    });
  }
};
