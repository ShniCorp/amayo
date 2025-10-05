import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { getPlayerStatsFormatted } from '../../../game/stats/service';
import type { TextBasedChannel } from 'discord.js';

export const command: CommandMessage = {
  name: 'stats',
  type: 'message',
  aliases: ['estadisticas', 'est'],
  cooldown: 5,
  description: 'Ver estadísticas detalladas de un jugador',
  usage: 'stats [@usuario]',
  run: async (message, args, client: Amayo) => {
    try {
      const guildId = message.guild!.id;
      const targetUser = message.mentions.users.first() || message.author;
      const userId = targetUser.id;

      // Obtener estadísticas formateadas
      const stats = await getPlayerStatsFormatted(userId, guildId);

      // Construir componentes de DisplayComponent
      const components: any[] = [
        // Header
        {
          type: 10,
          content: `# 📊 Estadísticas de ${targetUser.username}`
        },
        { type: 14, divider: true }
      ];

      // Actividades
      if (stats.activities) {
        const activitiesText = Object.entries(stats.activities)
          .map(([key, value]) => `${key}: **${value.toLocaleString()}**`)
          .join('\n');
        components.push({
          type: 9,
          components: [{
            type: 10,
            content: `**🎮 ACTIVIDADES**\n${activitiesText || 'Sin datos'}`
          }]
        });
        components.push({ type: 14, spacing: 1 });
      }

      // Combate
      if (stats.combat) {
        const combatText = Object.entries(stats.combat)
          .map(([key, value]) => `${key}: **${value.toLocaleString()}**`)
          .join('\n');
        components.push({
          type: 9,
          components: [{
            type: 10,
            content: `**⚔️ COMBATE**\n${combatText || 'Sin datos'}`
          }]
        });
        components.push({ type: 14, spacing: 1 });
      }

      // Economía
      if (stats.economy) {
        const economyText = Object.entries(stats.economy)
          .map(([key, value]) => `${key}: **${value.toLocaleString()}**`)
          .join('\n');
        components.push({
          type: 9,
          components: [{
            type: 10,
            content: `**💰 ECONOMÍA**\n${economyText || 'Sin datos'}`
          }]
        });
        components.push({ type: 14, spacing: 1 });
      }

      // Items
      if (stats.items) {
        const itemsText = Object.entries(stats.items)
          .map(([key, value]) => `${key}: **${value.toLocaleString()}**`)
          .join('\n');
        components.push({
          type: 9,
          components: [{
            type: 10,
            content: `**📦 ITEMS**\n${itemsText || 'Sin datos'}`
          }]
        });
        components.push({ type: 14, spacing: 1 });
      }

      // Récords
      if (stats.records) {
        const recordsText = Object.entries(stats.records)
          .map(([key, value]) => `${key}: **${value.toLocaleString()}**`)
          .join('\n');
        components.push({
          type: 9,
          components: [{
            type: 10,
            content: `**🏆 RÉCORDS**\n${recordsText || 'Sin datos'}`
          }]
        });
      }

      // Crear DisplayComponent
      const display = {
        type: 17,
        accent_color: 0x5865F2,
        components
      };

      // Enviar con flags
      const channel = message.channel as TextBasedChannel & { send: Function };
      await (channel.send as any)({
        display,
        flags: 32768, // MessageFlags.IS_COMPONENTS_V2
        reply: { messageReference: message.id }
      });
    } catch (error) {
      console.error('Error en comando stats:', error);
      await message.reply('❌ Error al obtener las estadísticas.');
    }
  }
};
