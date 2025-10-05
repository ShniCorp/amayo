import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import { prisma } from '../../../core/database/prisma';
import { ComponentType, ButtonStyle } from 'discord-api-types/v10';
import type { MessageComponentInteraction, TextBasedChannel } from 'discord.js';

export const command: CommandMessage = {
  name: 'logros-lista',
  type: 'message',
  aliases: ['lista-logros', 'achievements-list'],
  cooldown: 5,
  description: 'Ver lista de todos los logros del servidor',
  usage: 'logros-lista [pagina]',
  run: async (message, args, client: Amayo) => {
    const guildId = message.guild!.id;
    const page = parseInt(args[0]) || 1;
    const perPage = 5;

    const total = await prisma.achievement.count({
      where: { OR: [{ guildId }, { guildId: null }] }
    });

    const achievements = await prisma.achievement.findMany({
      where: { OR: [{ guildId }, { guildId: null }] },
      orderBy: [{ category: 'asc' }, { points: 'desc' }],
      skip: (page - 1) * perPage,
      take: perPage
    });

    if (achievements.length === 0) {
      await message.reply('No hay logros configurados en este servidor.');
      return;
    }

    const totalPages = Math.ceil(total / perPage);

    const display = {
      type: 17,
      accent_color: 0xFFD700,
      components: [
        {
          type: 9,
          components: [
            {
              type: 10,
              content: `**🏆 Lista de Logros**\nPágina ${page}/${totalPages} • Total: ${total}`
            }
          ]
        },
        { type: 14, divider: true },
        ...achievements.map(ach => ({
          type: 9,
          components: [
            {
              type: 10,
              content: `${ach.icon || '🏆'} **${ach.name}** (${ach.points} pts)\n` +
                       `└ Key: \`${ach.key}\`\n` +
                       `└ Categoría: ${ach.category}\n` +
                       `└ ${ach.description}\n` +
                       `└ ${ach.hidden ? '🔒 Oculto' : '👁️ Visible'}` +
                       (ach.guildId === guildId ? ' • 📍 Local' : ' • 🌐 Global')
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
        custom_id: `ach_list_prev_${page}`
      });
    }

    if (page < totalPages) {
      buttons.push({
        type: ComponentType.Button,
        style: ButtonStyle.Secondary,
        label: 'Siguiente ▶',
        custom_id: `ach_list_next_${page}`
      });
    }

    buttons.push({
      type: ComponentType.Button,
      style: ButtonStyle.Primary,
      label: 'Ver Detalle',
      custom_id: 'ach_view_detail'
    });

    const channel = message.channel as TextBasedChannel & { send: Function };
    const msg = await (channel.send as any)({
      display,
      components: buttons.length > 0 ? [{
        type: ComponentType.ActionRow,
        components: buttons
      }] : []
    });

    const collector = msg.createMessageComponentCollector({
      time: 5 * 60_000,
      filter: (i) => i.user.id === message.author.id
    });

    collector.on('collect', async (i: MessageComponentInteraction) => {
      if (!i.isButton()) return;

      if (i.customId.startsWith('ach_list_prev_')) {
        const currentPage = parseInt(i.customId.split('_')[3]);
        await i.deferUpdate();
        // Re-ejecutar comando con página anterior
        args[0] = String(currentPage - 1);
        await command.run!(message, args, client);
        collector.stop();
      } else if (i.customId.startsWith('ach_list_next_')) {
        const currentPage = parseInt(i.customId.split('_')[3]);
        await i.deferUpdate();
        // Re-ejecutar comando con página siguiente
        args[0] = String(currentPage + 1);
        await command.run!(message, args, client);
        collector.stop();
      } else if (i.customId === 'ach_view_detail') {
        await i.reply({
          content: '💡 Usa `!logro-ver <key>` para ver detalles de un logro específico.',
          flags: 64
        });
      }
    });
  }
};
