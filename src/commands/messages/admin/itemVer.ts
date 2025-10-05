import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import type { TextBasedChannel } from 'discord.js';

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

    const display = {
      type: 17,
      accent_color: 0x00D9FF,
      components: [
        {
          type: 9,
          components: [{
            type: 10,
            content: `**🛠️ ${item.name || item.key}**`
          }]
        },
        { type: 14, divider: true },
        {
          type: 9,
          components: [{
            type: 10,
            content: `**Key:** \`${item.key}\`\n` +
                     `**Nombre:** ${item.name || '*Sin nombre*'}\n` +
                     `**Descripción:** ${item.description || '*Sin descripción*'}\n` +
                     `**Categoría:** ${item.category || '*Sin categoría*'}\n` +
                     `**Stackable:** ${item.stackable ? 'Sí' : 'No'}\n` +
                     `**Máx. Inventario:** ${item.maxPerInventory || 'Ilimitado'}\n` +
                     `**Ámbito:** ${item.guildId ? '📍 Local del servidor' : '🌐 Global'}`
          }]
        }
      ]
    };

    if (tags.length > 0) {
      display.components.push({ type: 14, divider: true });
      display.components.push({
        type: 9,
        components: [{
          type: 10,
          content: `**Tags:** ${tags.join(', ')}`
        }]
      });
    }

    if (item.icon) {
      display.components.push({ type: 14, divider: true });
      display.components.push({
        type: 9,
        components: [{
          type: 10,
          content: `**Icon URL:** ${item.icon}`
        }]
      });
    }

    if (Object.keys(props).length > 0) {
      display.components.push({ type: 14, divider: true });
      display.components.push({
        type: 9,
        components: [{
          type: 10,
          content: `**Props (JSON):**\n\`\`\`json\n${JSON.stringify(props, null, 2)}\n\`\`\``
        }]
      });
    }

    const channel = message.channel as TextBasedChannel & { send: Function };
    await (channel.send as any)({
      display,
      reply: { messageReference: message.id }
    });
  }
};
