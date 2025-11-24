import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { prisma } from '../../../core/database/prisma';
import type { TextBasedChannel } from 'discord.js';

export const command: CommandMessage = {
  name: 'cooldowns',
  type: 'message',
  aliases: ['cds', 'tiempos', 'cd'],
  cooldown: 3,
  description: 'Ver todos tus cooldowns activos',
  usage: 'cooldowns',
  run: async (message, args, client: Amayo) => {
    try {
      const userId = message.author.id;
      const guildId = message.guild!.id;

      // Obtener todos los cooldowns activos
      const cooldowns = await prisma.actionCooldown.findMany({
        where: {
          userId,
          guildId,
          until: { gt: new Date() }
        },
        orderBy: { until: 'asc' }
      });

      if (cooldowns.length === 0) {
        await message.reply('✅ No tienes cooldowns activos. ¡Puedes realizar cualquier acción!');
        return;
      }

      // Emojis por tipo de acción
      const actionEmojis: Record<string, string> = {
        'mine': '⛏️',
        'fish': '🎣',
        'fight': '⚔️',
        'farm': '🌾',
        'craft': '🛠️',
        'smelt': '🔥',
        'shop': '🛒',
        'daily': '🎁',
        'consume': '🍖'
      };

      // Traducción de acciones
      const actionNames: Record<string, string> = {
        'mine': 'Minar',
        'fish': 'Pescar',
        'fight': 'Pelear',
        'farm': 'Granja',
        'craft': 'Craftear',
        'smelt': 'Fundir',
        'shop': 'Tienda',
        'daily': 'Diario',
        'consume': 'Consumir'
      };

      let cooldownText = '';
      const now = Date.now();

      for (const cd of cooldowns) {
        const remainingMs = cd.until.getTime() - now;
        const remainingSec = Math.ceil(remainingMs / 1000);
        
        // Formatear tiempo
        let timeStr = '';
        if (remainingSec >= 3600) {
          const hours = Math.floor(remainingSec / 3600);
          const mins = Math.floor((remainingSec % 3600) / 60);
          timeStr = `${hours}h ${mins}m`;
        } else if (remainingSec >= 60) {
          const mins = Math.floor(remainingSec / 60);
          const secs = remainingSec % 60;
          timeStr = `${mins}m ${secs}s`;
        } else {
          timeStr = `${remainingSec}s`;
        }

        // Buscar emoji y nombre
        const action = cd.key.split(':')[0];
        const emoji = actionEmojis[action] || '⏱️';
        const actionName = actionNames[action] || cd.key;

        cooldownText += `${emoji} **${actionName}**: ${timeStr}\n`;
      }

      // Crear DisplayComponent
      const display = {
        type: 17,
        accent_color: 0xFF6B6B,
        components: [
          {
            type: 10,
            content: `# ⏰ Cooldowns Activos\n${message.author.username}, estos son tus cooldowns:`
          },
          { type: 14, divider: true },
          {
            type: 9,
            components: [{
              type: 10,
              content: `**📋 Cooldowns (${cooldowns.length})**\n${cooldownText}`
            }]
          },
          { type: 14, spacing: 1 },
          {
            type: 10,
            content: `*Los cooldowns se actualizan en tiempo real*`
          }
        ]
      };

      // Enviar con flags
      const channel = message.channel as TextBasedChannel & { send: Function };
      await (channel.send as any)({
        display,
        flags: 32768, // MessageFlags.IS_COMPONENTS_V2
        reply: { messageReference: message.id }
      });
    } catch (error) {
      console.error('Error en comando cooldowns:', error);
      await message.reply('❌ Error al obtener los cooldowns.');
    }
  }
};
