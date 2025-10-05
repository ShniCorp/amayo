import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import { ComponentType, ButtonStyle } from 'discord-api-types/v10';
import type { MessageComponentInteraction, TextBasedChannel } from 'discord.js';

export const command: CommandMessage = {
  name: 'misiones-lista',
  type: 'message',
  aliases: ['lista-misiones', 'quests-list'],
  cooldown: 5,
  description: 'Ver lista de todas las misiones del servidor',
  usage: 'misiones-lista [pagina]',
  run: async (message, args, client: Amayo) => {
    const guildId = message.guild!.id;
    const page = parseInt(args[0]) || 1;
    const perPage = 5;

    const total = await prisma.quest.count({
      where: { OR: [{ guildId }, { guildId: null }] }
    });

    const quests = await prisma.quest.findMany({
      where: { OR: [{ guildId }, { guildId: null }] },
      orderBy: [{ type: 'asc' }, { category: 'asc' }],
      skip: (page - 1) * perPage,
      take: perPage
    });

    if (quests.length === 0) {
      await message.reply('No hay misiones configuradas en este servidor.');
      return;
    }

    const totalPages = Math.ceil(total / perPage);

    const typeEmojis: Record<string, string> = {
      daily: '📅',
      weekly: '📆',
      permanent: '♾️',
      event: '🎉'
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
              content: `**📜 Lista de Misiones**\nPágina ${page}/${totalPages} • Total: ${total}`
            }
          ]
        },
        { type: 14, divider: true },
        ...quests.map(quest => ({
          type: 9,
          components: [
            {
              type: 10,
              content: `${quest.icon || '📋'} **${quest.name}** ${typeEmojis[quest.type] || '📋'}\n` +
                       `└ Key: \`${quest.key}\`\n` +
                       `└ Tipo: ${quest.type} • Categoría: ${quest.category}\n` +
                       `└ ${quest.description}\n` +
                       `└ ${quest.active ? '✅ Activa' : '❌ Inactiva'} • ` +
                       `${quest.repeatable ? '🔄 Repetible' : '1️⃣ Una vez'}` +
                       (quest.guildId === guildId ? ' • 📍 Local' : ' • 🌐 Global')
            }
          ]
        }))
      ]
    };

    const buttons: any[] = [];
    
    if (page > 1) {
      buttons.push({
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: '◀ Anterior',
        custom_id: `quest_list_prev_${page}`
      });
    }

    if (page < totalPages) {
      buttons.push({
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: 'Siguiente ▶',
        custom_id: `quest_list_next_${page}`
      });
    }

    buttons.push({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      label: 'Ver Detalle',
      custom_id: 'quest_view_detail'
    });

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

      if (i.customId.startsWith('quest_list_prev_')) {
        const currentPage = parseInt(i.customId.split('_')[3]);
        await i.deferUpdate();
        args[0] = String(currentPage - 1);
        await command.run!(message, args, client);
        collector.stop();
      } else if (i.customId.startsWith('quest_list_next_')) {
        const currentPage = parseInt(i.customId.split('_')[3]);
        await i.deferUpdate();
        args[0] = String(currentPage + 1);
        await command.run!(message, args, client);
        collector.stop();
      } else if (i.customId === 'quest_view_detail') {
        await i.reply({
          content: '💡 Usa `!mision-ver <key>` para ver detalles de una misión específica.',
          flags: 64
        });
      }
    });
  }
};
