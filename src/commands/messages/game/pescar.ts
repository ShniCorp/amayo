import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { runMinigame } from '../../../game/minigames/service';
import { getDefaultLevel, findBestToolKey, parseGameArgs, resolveGuildAreaWithFallback } from './_helpers';
import { updateStats } from '../../../game/stats/service';
import { updateQuestProgress } from '../../../game/quests/service';
import { checkAchievements } from '../../../game/achievements/service';

export const command: CommandMessage = {
  name: 'pescar',
  type: 'message',
  aliases: ['fish'],
  cooldown: 5,
  description: 'Pesca en la laguna (usa caña si está disponible) y obtén recompensas.',
  usage: 'pescar [nivel] [toolKey] [area:clave] (ej: pescar 1 tool.rod.basic)',
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const { areaKey, levelArg, providedTool } = parseGameArgs(args, 'lagoon.shore');

    const { area, source } = await resolveGuildAreaWithFallback(guildId, areaKey);
    if (!area) {
      await message.reply(`⚠️ Área de laguna no configurada. Crea \`gameArea\` con key \`${areaKey}\` en este servidor.`);
      return;
    }
    const globalNotice = source === 'global'
      ? `ℹ️ Usando configuración global para \`${areaKey}\`. Puedes crear \`gameArea\` para personalizarla en este servidor.`
      : null;

    const level = levelArg ?? await getDefaultLevel(userId, guildId, area.id);
    const toolKey = providedTool ?? await findBestToolKey(userId, guildId, 'rod');

    try {
      const result = await runMinigame(userId, guildId, area.key, level, { toolKey: toolKey ?? undefined });
      
      // Actualizar stats y misiones
      await updateStats(userId, guildId, { fishingCompleted: 1 });
      await updateQuestProgress(userId, guildId, 'fish_count', 1);
      const newAchievements = await checkAchievements(userId, guildId, 'fish_count');
      
      const rewards = result.rewards.map(r => r.type === 'coins' ? `🪙 +${r.amount}` : `🐟 ${r.itemKey} x${r.qty}`).join(' · ') || '—';
      const mobs = result.mobs.length ? result.mobs.join(', ') : '—';
      const toolInfo = result.tool?.key ? `🎣 ${result.tool.key}${result.tool.broken ? ' (rota)' : ` (-${result.tool.durabilityDelta} dur.)`}` : '—';
      
      let response = globalNotice ? `${globalNotice}\n\n` : '';
      response += `🎣 Pesca (nivel ${level})
Recompensas: ${rewards}
Mobs: ${mobs}
Herramienta: ${toolInfo}`;

      if (newAchievements.length > 0) {
        response += `\n\n🏆 ¡Logro desbloqueado!`;
        for (const ach of newAchievements) {
          response += `\n✨ **${ach.name}** - ${ach.description}`;
        }
      }
      
      await message.reply(response);
    } catch (e: any) {
      await message.reply(`❌ No se pudo pescar: ${e?.message ?? e}`);
    }
  }
};

