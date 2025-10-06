import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { runMinigame } from '../../../game/minigames/service';
import { getDefaultLevel, findBestToolKey, parseGameArgs, resolveGuildAreaWithFallback } from './_helpers';
import { updateStats } from '../../../game/stats/service';
import { updateQuestProgress } from '../../../game/quests/service';
import { checkAchievements } from '../../../game/achievements/service';

export const command: CommandMessage = {
  name: 'mina',
  type: 'message',
  aliases: ['minar'],
  cooldown: 5,
  description: 'Ir a la mina (usa pico si está disponible) y obtener recompensas según el nivel.',
  usage: 'mina [nivel] [toolKey] [area:clave] (ej: mina 2 tool.pickaxe.basic)',
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const { areaKey, levelArg, providedTool } = parseGameArgs(args, 'mine.cavern');

    const { area, source } = await resolveGuildAreaWithFallback(guildId, areaKey);
    if (!area) {
      await message.reply(`⚠️ Área de mina no configurada. Pide a un admin crear \`gameArea\` con key \`${areaKey}\` en este servidor.`);
      return;
    }
    const globalNotice = source === 'global'
      ? `ℹ️ Usando configuración global para \`${areaKey}\`. Puedes crear \`gameArea\` para personalizarla en este servidor.`
      : null;

    const level = levelArg ?? await getDefaultLevel(userId, guildId, area.id);
    const toolKey = providedTool ?? await findBestToolKey(userId, guildId, 'pickaxe');

    try {
      const result = await runMinigame(userId, guildId, area.key, level, { toolKey: toolKey ?? undefined });
      
      // Actualizar stats
      await updateStats(userId, guildId, { minesCompleted: 1 });

      // Actualizar progreso de misiones
      await updateQuestProgress(userId, guildId, 'mine_count', 1);
      
      // Verificar logros
      const newAchievements = await checkAchievements(userId, guildId, 'mine_count');
      
      const rewards = result.rewards.map(r => r.type === 'coins' ? `🪙 +${r.amount}` : `📦 ${r.itemKey} x${r.qty}`).join(' · ') || '—';
      const mobs = result.mobs.length ? result.mobs.join(', ') : '—';
      const toolInfo = result.tool?.key ? `🔧 ${result.tool.key}${result.tool.broken ? ' (rota)' : ` (-${result.tool.durabilityDelta} dur.)`}` : '—';
      
      let response = globalNotice ? `${globalNotice}\n\n` : '';
      response += `⛏️ Mina (nivel ${level})
Recompensas: ${rewards}
Mobs: ${mobs}
Herramienta: ${toolInfo}`;

      // Notificar logros desbloqueados
      if (newAchievements.length > 0) {
        response += `\n\n🏆 ¡Logro desbloqueado!`;
        for (const ach of newAchievements) {
          response += `\n✨ **${ach.name}** - ${ach.description}`;
        }
      }
      
      await message.reply(response);
    } catch (e: any) {
      await message.reply(`❌ No se pudo minar: ${e?.message ?? e}`);
    }
  }
};

