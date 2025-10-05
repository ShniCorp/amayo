import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { getPlayerStatsFormatted } from '../../../game/stats/service';
import { EmbedBuilder } from 'discord.js';

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

      // Crear embed
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📊 Estadísticas de ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setTimestamp();

      // Actividades
      if (stats.activities) {
        const activitiesText = Object.entries(stats.activities)
          .map(([key, value]) => `${key}: **${value.toLocaleString()}**`)
          .join('\n');
        embed.addFields({ name: '🎮 Actividades', value: activitiesText || 'Sin datos', inline: true });
      }

      // Combate
      if (stats.combat) {
        const combatText = Object.entries(stats.combat)
          .map(([key, value]) => `${key}: **${value.toLocaleString()}**`)
          .join('\n');
        embed.addFields({ name: '⚔️ Combate', value: combatText || 'Sin datos', inline: true });
      }

      // Economía
      if (stats.economy) {
        const economyText = Object.entries(stats.economy)
          .map(([key, value]) => `${key}: **${value.toLocaleString()}**`)
          .join('\n');
        embed.addFields({ name: '💰 Economía', value: economyText || 'Sin datos', inline: false });
      }

      // Items
      if (stats.items) {
        const itemsText = Object.entries(stats.items)
          .map(([key, value]) => `${key}: **${value.toLocaleString()}**`)
          .join('\n');
        embed.addFields({ name: '📦 Items', value: itemsText || 'Sin datos', inline: true });
      }

      // Récords
      if (stats.records) {
        const recordsText = Object.entries(stats.records)
          .map(([key, value]) => `${key}: **${value.toLocaleString()}**`)
          .join('\n');
        embed.addFields({ name: '🏆 Récords', value: recordsText || 'Sin datos', inline: true });
      }

      embed.setFooter({ text: `Usa ${client.prefix}ranking-stats para ver el ranking global` });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en comando stats:', error);
      await message.reply('❌ Error al obtener las estadísticas.');
    }
  }
};
