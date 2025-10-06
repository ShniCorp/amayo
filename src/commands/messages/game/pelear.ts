import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { runMinigame } from '../../../game/minigames/service';
import { getDefaultLevel, findBestToolKey, parseGameArgs, resolveGuildAreaWithFallback, resolveAreaByType } from './_helpers';
import { updateStats } from '../../../game/stats/service';
import { updateQuestProgress } from '../../../game/quests/service';
import { checkAchievements } from '../../../game/achievements/service';

export const command: CommandMessage = {
  name: 'pelear',
  type: 'message',
  aliases: ['fight','arena'],
  cooldown: 8,
  description: 'Entra a la arena y pelea (usa espada si está disponible).',
  usage: 'pelear [nivel] [toolKey] [area:clave] (ej: pelear 1 weapon.sword.iron)',
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const { levelArg, providedTool, areaOverride } = parseGameArgs(args);

    const areaInfo = areaOverride
      ? await resolveGuildAreaWithFallback(guildId, areaOverride)
      : await resolveAreaByType(guildId, 'FIGHT');

    if (!areaInfo.area) {
      if (areaOverride) {
        await message.reply(`⚠️ No existe un área con key \`${areaOverride}\` para este servidor.`);
      } else {
        await message.reply('⚠️ No hay un área de tipo **FIGHT** configurada. Crea una con `!area-crear` o especifica `area:<key>`.');
      }
      return;
    }

    const { area, source } = areaInfo;
    const globalNotice = source === 'global'
      ? `ℹ️ Usando configuración global para \`${area.key}\`. Puedes crear \`gameArea\` tipo **FIGHT** para personalizarla en este servidor.`
      : null;

    const level = levelArg ?? await getDefaultLevel(userId, guildId, area.id);
    const toolKey = providedTool ?? await findBestToolKey(userId, guildId, 'sword');

    try {
      const result = await runMinigame(userId, guildId, area.key, level, { toolKey: toolKey ?? undefined });
      
      // Actualizar stats y misiones
      await updateStats(userId, guildId, { fightsCompleted: 1 });
      await updateQuestProgress(userId, guildId, 'fight_count', 1);
      
      // Contar mobs derrotados
      const mobsCount = result.mobs.length;
      if (mobsCount > 0) {
        await updateStats(userId, guildId, { mobsDefeated: mobsCount });
        await updateQuestProgress(userId, guildId, 'mob_defeat_count', mobsCount);
      }
      
      const newAchievements = await checkAchievements(userId, guildId, 'fight_count');
      
      const rewards = result.rewards.map(r => r.type === 'coins' ? `🪙 +${r.amount}` : `🎁 ${r.itemKey} x${r.qty}`).join(' · ') || '—';
      const mobs = result.mobs.length ? result.mobs.join(', ') : '—';
      const toolInfo = result.tool?.key ? `🗡️ ${result.tool.key}${result.tool.broken ? ' (rota)' : ` (-${result.tool.durabilityDelta} dur.)`}` : '—';
      
      let response = globalNotice ? `${globalNotice}\n\n` : '';
      response += `⚔️ Arena (nivel ${level})\nRecompensas: ${rewards}\nEnemigos: ${mobs}\nArma: ${toolInfo}`;

      if (newAchievements.length > 0) {
        response += `\n\n🏆 ¡Logro desbloqueado!`;
        for (const ach of newAchievements) {
          response += `\n✨ **${ach.name}** - ${ach.description}`;
        }
      }
      
      await message.reply(response);
    } catch (e: any) {
      await message.reply(`❌ No se pudo pelear: ${e?.message ?? e}`);
    }
  }
};

