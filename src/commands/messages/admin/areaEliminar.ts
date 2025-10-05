import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import { prisma } from '../../../core/database/prisma';
import type { TextBasedChannel } from 'discord.js';

export const command: CommandMessage = {
  name: 'area-eliminar',
  type: 'message',
  aliases: ['eliminar-area', 'area-delete'],
  cooldown: 5,
  description: 'Eliminar un área del servidor',
  usage: 'area-eliminar <key>',
  run: async (message, args, client: Amayo) => {
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, prisma);
    if (!allowed) {
      const channel = message.channel as TextBasedChannel & { send: Function };
      await (channel.send as any)({
        flags: 32768,
        components: [{
          type: 17,
          accent_color: 0xFF0000,
          components: [{
            type: 9,
            components: [{
              type: 10,
              content: '❌ **Error de Permisos**\n└ No tienes permisos de ManageGuild ni rol de staff.'
            }]
          }]
        }],
        message_reference: {
          message_id: message.id,
          channel_id: message.channel.id,
          guild_id: message.guild!.id,
          fail_if_not_exists: false
        }
      });
      return;
    }

    const guildId = message.guild!.id;
    const key = args[0]?.trim();

    if (!key) {
      const channel = message.channel as TextBasedChannel & { send: Function };
      await (channel.send as any)({
        flags: 32768,
        components: [{
          type: 17,
          accent_color: 0xFFA500,
          components: [{
            type: 9,
            components: [{
              type: 10,
              content: '⚠️ **Uso Incorrecto**\n└ Uso: `!area-eliminar <key>`\n└ Ejemplo: `!area-eliminar mine.cavern`'
            }]
          }]
        }],
        message_reference: {
          message_id: message.id,
          channel_id: message.channel.id,
          guild_id: message.guild!.id,
          fail_if_not_exists: false
        }
      });
      return;
    }

    const area = await prisma.gameArea.findFirst({
      where: { key, guildId }
    });

    if (!area) {
      const channel = message.channel as TextBasedChannel & { send: Function };
      await (channel.send as any)({
        flags: 32768,
        components: [{
          type: 17,
          accent_color: 0xFF0000,
          components: [{
            type: 9,
            components: [{
              type: 10,
              content: `❌ **Área No Encontrada**\n└ No se encontró el área local con key \`${key}\` en este servidor.`
            }]
          }]
        }],
        message_reference: {
          message_id: message.id,
          channel_id: message.channel.id,
          guild_id: message.guild!.id,
          fail_if_not_exists: false
        }
      });
      return;
    }

    const levelsCount = await prisma.gameAreaLevel.count({
      where: { areaId: area.id }
    });

    if (levelsCount > 0) {
      await prisma.gameAreaLevel.deleteMany({
        where: { areaId: area.id }
      });
    }

    await prisma.gameArea.delete({
      where: { id: area.id }
    });

    const channel = message.channel as TextBasedChannel & { send: Function };
    await (channel.send as any)({
      flags: 32768,
      components: [{
        type: 17,
        accent_color: 0x00FF00,
        components: [
          {
            type: 9,
            components: [{
              type: 10,
              content: `✅ **Área Eliminada Exitosamente**\n└ Key: \`${key}\``
            }]
          },
          ...(levelsCount > 0 ? [{
            type: 14,
            divider: true
          }, {
            type: 9,
            components: [{
              type: 10,
              content: `⚠️ Se eliminaron ${levelsCount} nivel(es) asociado(s).`
            }]
          }] : [])
        ]
      }],
      message_reference: {
        message_id: message.id,
        channel_id: message.channel.id,
        guild_id: message.guild!.id,
        fail_if_not_exists: false
      }
    });
  }
};
