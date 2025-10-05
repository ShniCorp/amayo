import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { runMinigame } from '../../../game/minigames/service';
import { resolveArea, getDefaultLevel, findBestToolKey } from './_helpers';

export const command: CommandMessage = {
  name: 'pescar',
  type: 'message',
  aliases: ['fish'],
  cooldown: 5,
  description: 'Pesca en la laguna (usa caña si está disponible) y obtén recompensas.',
  usage: 'pescar [nivel] [toolKey] (ej: pescar 1 tool.rod.basic)',
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const areaKey = 'lagoon.shore';

    const area = await resolveArea(guildId, areaKey);
    if (!area) { await message.reply('⚠️ Área de laguna no configurada. Crea `gameArea` con key `lagoon.shore`.'); return; }

    const levelArg = args[0] && /^\d+$/.test(args[0]) ? parseInt(args[0], 10) : null;
    const providedTool = args.find((a) => a && !/^\d+$/.test(a));

    const level = levelArg ?? await getDefaultLevel(userId, guildId, area.id);
    const toolKey = providedTool ?? await findBestToolKey(userId, guildId, 'rod');

    try {
      const result = await runMinigame(userId, guildId, areaKey, level, { toolKey: toolKey ?? undefined });
      const rewards = result.rewards.map(r => r.type === 'coins' ? `🪙 +${r.amount}` : `🐟 ${r.itemKey} x${r.qty}`).join(' · ') || '—';
      const mobs = result.mobs.length ? result.mobs.join(', ') : '—';
      const toolInfo = result.tool?.key ? `🎣 ${result.tool.key}${result.tool.broken ? ' (rota)' : ` (-${result.tool.durabilityDelta} dur.)`}` : '—';
      await message.reply(`🎣 Pesca (nivel ${level})
Recompensas: ${rewards}
Mobs: ${mobs}
Herramienta: ${toolInfo}`);
    } catch (e: any) {
      await message.reply(`❌ No se pudo pescar: ${e?.message ?? e}`);
    }
  }
};

