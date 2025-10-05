import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { getStreakInfo, updateStreak } from '../../../game/streaks/service';
import { EmbedBuilder } from 'discord.js';

export const command: CommandMessage = {
  name: 'racha',
  type: 'message',
  aliases: ['streak', 'daily'],
  cooldown: 10,
  description: 'Ver tu racha diaria y reclamar recompensa',
  usage: 'racha',
  run: async (message, args, client: Amayo) => {
    try {
      const userId = message.author.id;
      const guildId = message.guild!.id;

      // Actualizar racha
      const { streak, newDay, rewards, daysIncreased } = await updateStreak(userId, guildId);

      const embed = new EmbedBuilder()
        .setColor(daysIncreased ? 0x00FF00 : 0xFFA500)
        .setTitle('🔥 Racha Diaria')
        .setDescription(`${message.author.username}, aquí está tu racha:`)
        .setThumbnail(message.author.displayAvatarURL({ size: 128 }));

      // Racha actual
      embed.addFields(
        { 
          name: '🔥 Racha Actual', 
          value: `**${streak.currentStreak}** días consecutivos`, 
          inline: true 
        },
        { 
          name: '⭐ Mejor Racha', 
          value: `**${streak.longestStreak}** días`, 
          inline: true 
        },
        { 
          name: '📅 Días Activos', 
          value: `**${streak.totalDaysActive}** días totales`, 
          inline: true 
        }
      );

      // Mensaje de estado
      if (newDay) {
        if (daysIncreased) {
          embed.addFields({ 
            name: '✅ ¡Racha Incrementada!', 
            value: `Has mantenido tu racha por **${streak.currentStreak}** días seguidos.`, 
            inline: false 
          });
        } else {
          embed.addFields({ 
            name: '⚠️ Racha Reiniciada', 
            value: 'Pasó más de un día sin actividad. Tu racha se ha reiniciado.', 
            inline: false 
          });
        }

        // Mostrar recompensas
        if (rewards) {
          let rewardsText = '';
          if (rewards.coins) rewardsText += `💰 **${rewards.coins.toLocaleString()}** monedas\n`;
          if (rewards.items) {
            rewards.items.forEach(item => {
              rewardsText += `📦 **${item.quantity}x** ${item.key}\n`;
            });
          }
          
          if (rewardsText) {
            embed.addFields({ 
              name: '🎁 Recompensa del Día', 
              value: rewardsText, 
              inline: false 
            });
          }
        }
      } else {
        embed.addFields({ 
          name: 'ℹ️ Ya Reclamaste Hoy', 
          value: 'Ya has reclamado tu recompensa diaria. Vuelve mañana para continuar tu racha.', 
          inline: false 
        });
      }

      // Próximos hitos
      const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
      const nextMilestone = milestones.find(m => m > streak.currentStreak);
      
      if (nextMilestone) {
        const remaining = nextMilestone - streak.currentStreak;
        embed.addFields({ 
          name: '🎯 Próximo Hito', 
          value: `Faltan **${remaining}** días para alcanzar el día **${nextMilestone}**`, 
          inline: false 
        });
      }

      embed.setFooter({ text: 'Juega todos los días para mantener tu racha activa' });
      embed.setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en comando racha:', error);
      await message.reply('❌ Error al obtener tu racha diaria.');
    }
  }
};
