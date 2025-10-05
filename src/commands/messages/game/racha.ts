import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { getStreakInfo, updateStreak } from '../../../game/streaks/service';
import type { TextBasedChannel } from 'discord.js';

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

      // Construir componentes
      const components: any[] = [
        {
          type: 10,
          content: `# 🔥 Racha Diaria de ${message.author.username}`
        },
        { type: 14, divider: true },
        {
          type: 9,
          components: [{
            type: 10,
            content: `**📊 ESTADÍSTICAS**\n` +
                     `🔥 Racha Actual: **${streak.currentStreak}** días\n` +
                     `⭐ Mejor Racha: **${streak.longestStreak}** días\n` +
                     `📅 Días Activos: **${streak.totalDaysActive}** días`
          }]
        },
        { type: 14, spacing: 1 }
      ];

      // Mensaje de estado
      if (newDay) {
        if (daysIncreased) {
          components.push({
            type: 9,
            components: [{
              type: 10,
              content: `**✅ ¡RACHA INCREMENTADA!**\nHas mantenido tu racha por **${streak.currentStreak}** días seguidos.`
            }]
          });
        } else {
          components.push({
            type: 9,
            components: [{
              type: 10,
              content: `**⚠️ RACHA REINICIADA**\nPasó más de un día sin actividad. Tu racha se ha reiniciado.`
            }]
          });
        }

        // Mostrar recompensas
        if (rewards) {
          let rewardsText = '**🎁 RECOMPENSA DEL DÍA**\n';
          if (rewards.coins) rewardsText += `💰 **${rewards.coins.toLocaleString()}** monedas\n`;
          if (rewards.items) {
            rewards.items.forEach(item => {
              rewardsText += `📦 **${item.quantity}x** ${item.key}\n`;
            });
          }
          
          components.push({ type: 14, spacing: 1 });
          components.push({
            type: 9,
            components: [{
              type: 10,
              content: rewardsText
            }]
          });
        }
      } else {
        components.push({
          type: 9,
          components: [{
            type: 10,
            content: `**ℹ️ YA RECLAMASTE HOY**\nYa has reclamado tu recompensa diaria. Vuelve mañana para continuar tu racha.`
          }]
        });
      }

      // Próximos hitos
      const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
      const nextMilestone = milestones.find(m => m > streak.currentStreak);
      
      if (nextMilestone) {
        const remaining = nextMilestone - streak.currentStreak;
        components.push({ type: 14, spacing: 1 });
        components.push({
          type: 9,
          components: [{
            type: 10,
            content: `**🎯 PRÓXIMO HITO**\nFaltan **${remaining}** días para alcanzar el día **${nextMilestone}**`
          }]
        });
      }

      const display = {
        type: 17,
        accent_color: daysIncreased ? 0x00FF00 : 0xFFA500,
        components
      };

      const channel = message.channel as TextBasedChannel & { send: Function };
      await (channel.send as any)({
        display,
        flags: 32768,
        reply: { messageReference: message.id }
      });
    } catch (error) {
      console.error('Error en comando racha:', error);
      await message.reply('❌ Error al obtener tu racha diaria.');
    }
  }
};
