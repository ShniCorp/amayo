import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { claimQuestReward, getPlayerQuests } from '../../../game/quests/service';
import { EmbedBuilder } from 'discord.js';

export const command: CommandMessage = {
  name: 'mision-reclamar',
  type: 'message',
  aliases: ['claim-quest', 'reclamar-mision'],
  cooldown: 3,
  description: 'Reclamar recompensa de misión completada',
  usage: 'mision-reclamar <numero>',
  run: async (message, args, client: Amayo) => {
    try {
      const userId = message.author.id;
      const guildId = message.guild!.id;

      if (!args[0]) {
        await message.reply(`❌ Uso: \`!mision-reclamar <numero>\`\nEjemplo: \`!mision-reclamar 1\``);
        return;
      }

      // Obtener misiones completadas
      const quests = await getPlayerQuests(userId, guildId);
      const allQuests = [...quests.daily, ...quests.weekly, ...quests.permanent, ...quests.event];
      const claimable = allQuests.filter(q => q.canClaim);

      if (claimable.length === 0) {
        await message.reply('❌ No tienes misiones listas para reclamar. Completa misiones primero usando los comandos del bot.');
        return;
      }

      const index = parseInt(args[0]) - 1;
      if (isNaN(index) || index < 0 || index >= claimable.length) {
        await message.reply(`❌ Número de misión inválido. Elige un número entre 1 y ${claimable.length}.`);
        return;
      }

      const selected = claimable[index];
      
      // Reclamar recompensa
      const { quest, rewards } = await claimQuestReward(userId, guildId, selected.quest.id);

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎉 ¡Misión Completada!')
        .setDescription(`Has reclamado las recompensas de **${quest.name}**`)
        .setThumbnail(message.author.displayAvatarURL({ size: 128 }));

      // Mostrar recompensas
      if (rewards.length > 0) {
        embed.addFields({ 
          name: '🎁 Recompensas Recibidas', 
          value: rewards.join('\n'), 
          inline: false 
        });
      }

      // Info de la misión
      embed.addFields(
        { name: '📜 Misión', value: quest.description, inline: false }
      );

      embed.setFooter({ text: `Usa !misiones para ver más misiones` });
      embed.setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error: any) {
      console.error('Error en comando mision-reclamar:', error);
      await message.reply(`❌ ${error.message || 'Error al reclamar la misión.'}`);
    }
  }
};
