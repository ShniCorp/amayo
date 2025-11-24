import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { getPlayerAchievements, getAchievementStats, createProgressBar } from '../../../game/achievements/service';
import { EmbedBuilder } from 'discord.js';

export const command: CommandMessage = {
  name: 'logros',
  type: 'message',
  aliases: ['achievements', 'logro', 'achievement'],
  cooldown: 5,
  description: 'Ver tus logros desbloqueados y progreso',
  usage: 'logros [@usuario]',
  run: async (message, args, client: Amayo) => {
    try {
      const guildId = message.guild!.id;
      const targetUser = message.mentions.users.first() || message.author;
      const userId = targetUser.id;

      // Obtener logros del jugador
      const { unlocked, inProgress } = await getPlayerAchievements(userId, guildId);
      const achievementStats = await getAchievementStats(userId, guildId);

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`🏆 Logros de ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setDescription(
          `**${achievementStats.unlocked}/${achievementStats.total}** logros desbloqueados ` +
          `(${achievementStats.percentage}%)\n` +
          `⭐ **${achievementStats.points}** puntos totales`
        );

      // Logros desbloqueados recientes (últimos 5)
      if (unlocked.length > 0) {
        const recentUnlocked = unlocked.slice(0, 5);
        let unlockedText = '';
        
        for (const pa of recentUnlocked) {
          const icon = pa.achievement.icon || '🏆';
          const points = pa.achievement.points || 10;
          unlockedText += `${icon} **${pa.achievement.name}** (+${points} pts)\n`;
          unlockedText += `└ ${pa.achievement.description}\n`;
        }
        
        embed.addFields({ 
          name: `✅ Desbloqueados Recientes (${unlocked.length})`, 
          value: unlockedText || 'Ninguno aún', 
          inline: false 
        });
      }

      // Logros en progreso (top 5)
      if (inProgress.length > 0) {
        const topInProgress = inProgress.slice(0, 5);
        let progressText = '';
        
        for (const pa of topInProgress) {
          const icon = pa.achievement.icon || '🔒';
          const req = pa.achievement.requirements as any;
          const progress = pa.progress;
          const required = req.value;
          const bar = createProgressBar(progress, required, 8);
          
          progressText += `${icon} **${pa.achievement.name}**\n`;
          progressText += `└ ${bar} (${progress}/${required})\n`;
        }
        
        embed.addFields({ 
          name: `📈 En Progreso (${inProgress.length})`, 
          value: progressText, 
          inline: false 
        });
      }

      // Categorías
      const categories = ['mining', 'fishing', 'combat', 'economy', 'exploration'];
      const categoryEmojis: Record<string, string> = {
        mining: '⛏️',
        fishing: '🎣',
        combat: '⚔️',
        economy: '💰',
        exploration: '🗺️'
      };

      let categoryText = '';
      for (const cat of categories) {
        const count = unlocked.filter(pa => pa.achievement.category === cat).length;
        if (count > 0) {
          categoryText += `${categoryEmojis[cat]} ${count} `;
        }
      }
      
      if (categoryText) {
        embed.addFields({ 
          name: '📊 Por Categoría', 
          value: categoryText, 
          inline: false 
        });
      }

      if (unlocked.length === 0 && inProgress.length === 0) {
        embed.setDescription(
          'Aún no has desbloqueado ningún logro.\n' +
          '¡Empieza a jugar para obtener logros y puntos!'
        );
      }

      embed.setFooter({ text: 'Los logros se desbloquean automáticamente al cumplir requisitos' });
      embed.setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error en comando logros:', error);
      await message.reply('❌ Error al obtener los logros.');
    }
  }
};
