import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { hasManageGuildOrStaff } from '../../../core/lib/permissions';
import { prisma } from '../../../core/database/prisma';
import type { TextBasedChannel } from 'discord.js';
import { buildDisplay, dividerBlock, textBlock } from '../../../core/lib/componentsV2';

export const command: CommandMessage = {
  name: 'area-eliminar',
  type: 'message',
  aliases: ['eliminar-area', 'area-delete'],
  cooldown: 5,
  description: 'Eliminar un área del servidor',
  usage: 'area-eliminar <key>',
  run: async (message, args, client: Amayo) => {
    const channel = message.channel as TextBasedChannel & { send: Function };
    const allowed = await hasManageGuildOrStaff(message.member, message.guild!.id, prisma);
    if (!allowed) {
      await (channel.send as any)({
        content: null,
        flags: 32768,
        components: [
          buildDisplay(0xFF0000, [
            textBlock('❌ **Error de Permisos**\n└ No tienes permisos de ManageGuild ni rol de staff.')
          ])
        ],
        reply: { messageReference: message.id }
      });
      return;
    }

    const guildId = message.guild!.id;
    const key = args[0]?.trim();

    if (!key) {
      await (channel.send as any)({
        content: null,
        flags: 32768,
        components: [
          buildDisplay(0xFFA500, [
            textBlock('⚠️ **Uso Incorrecto**'),
            dividerBlock(),
            textBlock('└ Uso: `!area-eliminar <key>`\n└ Ejemplo: `!area-eliminar mine.cavern`')
          ])
        ],
        reply: { messageReference: message.id }
      });
      return;
    }

    const area = await prisma.gameArea.findFirst({
      where: { key, guildId }
    });

    if (!area) {
      await (channel.send as any)({
        content: null,
        flags: 32768,
        components: [
          buildDisplay(0xFF0000, [
            textBlock(`❌ **Área No Encontrada**`),
            dividerBlock(),
            textBlock(`└ No se encontró el área local con key \`${key}\` en este servidor.`)
          ])
        ],
        reply: { messageReference: message.id }
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

    await (channel.send as any)({
      content: null,
      flags: 32768,
      components: [
        buildDisplay(0x00FF00, [
          textBlock(`✅ **Área Eliminada Exitosamente**`),
          dividerBlock(),
          textBlock(`└ Key: \`${key}\``),
          ...(levelsCount > 0
            ? [
                dividerBlock(),
                textBlock(`⚠️ Se eliminaron ${levelsCount} nivel(es) asociado(s).`),
              ]
            : []),
        ])
      ],
      reply: { messageReference: message.id }
    });
  }
};
