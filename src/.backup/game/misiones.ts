import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { getPlayerQuests, claimQuestReward } from '../../../game/quests/service';
import { createProgressBar } from '../../../game/achievements/service';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const command: CommandMessage = {
  name: 'misiones',
  type: 'message',
  aliases: ['quests', 'mision', 'quest'],
  cooldown: 5,
  description: 'Ver misiones disponibles y tu progreso',
  usage: 'misiones [categoria]',
  run: async (message, args, client: Amayo) => {
    try {
      const userId = message.author.id;
      const guildId = message.guild!.id;

      // Obtener misiones con progreso
      const quests = await getPlayerQuests(userId, guildId);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📜 Misiones Disponibles')
        .setDescription(`${message.author.username}, aquí están tus misiones:`)
        .setThumbnail(message.author.displayAvatarURL({ size: 128 }));

      // Emojis por categoría
      const categoryEmojis: Record<string, string> = {
        mining: '⛏️',
        fishing: '🎣',
        combat: '⚔️',
        economy: '💰',
        exploration: '🗺️',
        crafting: '🛠️'
      };

      // Función para formatear una lista de misiones
      const formatQuests = (questList: any[], type: string) => {
        if (questList.length === 0) return null;

        let text = '';
        for (const { quest, progress, canClaim, percentage } of questList) {
          const icon = categoryEmojis[quest.category] || '📋';
          const req = quest.requirements as any;
          const currentProgress = progress?.progress || 0;
          const required = req.count;
          
          // Estado
          let status = '';
          if (canClaim) {
            status = '✅ ¡Listo para reclamar!';
          } else if (progress?.completed) {
            status = '🎁 Completada';
          } else {
            const bar = createProgressBar(currentProgress, required, 8);
            status = `${bar}`;
          }

          text += `${icon} **${quest.name}**\n`;
          text += `└ ${quest.description}\n`;
          text += `└ ${status}\n`;
          
          // Recompensas
          const rewards = quest.rewards as any;
          let rewardStr = '';
          if (rewards.coins) rewardStr += `💰 ${rewards.coins} `;
          if (rewards.items && rewards.items.length > 0) {
            rewardStr += `📦 ${rewards.items.length} items `;
          }
          if (rewardStr) {
            text += `└ Recompensa: ${rewardStr}\n`;
          }
          
          text += '\n';
        }

        return text;
      };

      // Misiones diarias
      if (quests.daily.length > 0) {
        const dailyText = formatQuests(quests.daily, 'daily');
        if (dailyText) {
          embed.addFields({ 
            name: '📅 Misiones Diarias', 
            value: dailyText, 
            inline: false 
          });
        }
      }

      // Misiones semanales
      if (quests.weekly.length > 0) {
        const weeklyText = formatQuests(quests.weekly, 'weekly');
        if (weeklyText) {
          embed.addFields({ 
            name: '📆 Misiones Semanales', 
            value: weeklyText, 
            inline: false 
          });
        }
      }

      // Misiones permanentes
      if (quests.permanent.length > 0) {
        const permanentText = formatQuests(quests.permanent.slice(0, 3), 'permanent');
        if (permanentText) {
          embed.addFields({ 
            name: '♾️ Misiones Permanentes', 
            value: permanentText, 
            inline: false 
          });
        }
      }

      // Misiones de evento
      if (quests.event.length > 0) {
        const eventText = formatQuests(quests.event, 'event');
        if (eventText) {
          embed.addFields({ 
            name: '🎉 Misiones de Evento', 
            value: eventText, 
            inline: false 
          });
        }
      }

      // Verificar si hay misiones para reclamar
      const canClaim = [...quests.daily, ...quests.weekly, ...quests.permanent, ...quests.event]
        .filter(q => q.canClaim);

      if (canClaim.length > 0) {
        embed.addFields({ 
          name: '🎁 ¡Misiones Listas!', 
          value: `Tienes **${canClaim.length}** misiones listas para reclamar.\nUsa \`!mision-reclamar <id>\` para reclamar recompensas.`, 
          inline: false 
        });
      }

      if (quests.daily.length === 0 && quests.weekly.length === 0 && quests.permanent.length === 0) {
        embed.setDescription(
          'No hay misiones disponibles en este momento.\n' +
          'Las misiones diarias se generan automáticamente cada día.'
        );
      }

      embed.setFooter({ text: 'Completa misiones para ganar recompensas' });
      embed.setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en comando misiones:', error);
      await message.reply('❌ Error al obtener las misiones.');
    }
  }
};
