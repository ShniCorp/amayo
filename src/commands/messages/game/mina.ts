import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { runMinigame } from '../../../game/minigames/service';
import { resolveArea, getDefaultLevel, findBestToolKey } from './_helpers';
import { updateStats } from '../../../game/stats/service';
import { updateQuestProgress } from '../../../game/quests/service';
import { checkAchievements } from '../../../game/achievements/service';

export const command: CommandMessage = {
  name: 'mina',
  type: 'message',
  aliases: ['minar'],
  cooldown: 5,
  description: 'Ir a la mina (usa pico si está disponible) y obtener recompensas según el nivel.',
  usage: 'mina [nivel] [toolKey] (ej: mina 2 tool.pickaxe.basic)',
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const areaKey = args[0] === 'mine.cavern' ? args[0] : 'mine.cavern'; // Forzar key de área de mina

    const area = await resolveArea(guildId, areaKey);
    if (!area) { await message.reply('⚠️ Área de mina no configurada. Pide a un admin crear `gameArea` con key `mine.cavern`.'); return; }

    const levelArg = args[0] && /^\d+$/.test(args[0]) ? parseInt(args[0], 10) : null;
    const providedTool = args.find((a) => a && !/^\d+$/.test(a));

    const level = levelArg ?? await getDefaultLevel(userId, guildId, area.id);
    const toolKey = providedTool ?? await findBestToolKey(userId, guildId, 'pickaxe');

    try {
      const result = await runMinigame(userId, guildId, areaKey, level, { toolKey: toolKey ?? undefined });
      
      // Actualizar stats
      await updateStats(userId, guildId, { minesCompleted: 1 });
      
      // Actualizar progreso de misiones
      await updateQuestProgress(userId, guildId, 'mine_count', 1);
      
      // Verificar logros
      const newAchievements = await checkAchievements(userId, guildId, 'mine_count');
      
      const rewards = result.rewards.map(r => r.type === 'coins' ? `🪙 +${r.amount}` : `📦 ${r.itemKey} x${r.qty}`).join(' · ') || '—';
      const mobs = result.mobs.length ? result.mobs.join(', ') : '—';
      const toolInfo = result.tool?.key ? `🔧 ${result.tool.key}${result.tool.broken ? ' (rota)' : ` (-${result.tool.durabilityDelta} dur.)`}` : '—';
      
      let response = `⛏️ Mina (nivel ${level})
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

