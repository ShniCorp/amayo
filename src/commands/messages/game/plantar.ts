import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { runMinigame } from '../../../game/minigames/service';
import { resolveArea, getDefaultLevel, findBestToolKey } from './_helpers';

export const command: CommandMessage = {
  name: 'plantar',
  type: 'message',
  aliases: ['farm'],
  cooldown: 5,
  description: 'Planta/cosecha en el campo (usa azada si está disponible).',
  usage: 'plantar [nivel] [toolKey] (ej: plantar 1 tool.hoe.basic)',
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const areaKey = 'farm.field';

    const area = await resolveArea(guildId, areaKey);
    if (!area) { await message.reply('⚠️ Área de cultivo no configurada. Crea `gameArea` con key `farm.field`.'); return; }

    const levelArg = args[0] && /^\d+$/.test(args[0]) ? parseInt(args[0], 10) : null;
    const providedTool = args.find((a) => a && !/^\d+$/.test(a));

    const level = levelArg ?? await getDefaultLevel(userId, guildId, area.id);
    const toolKey = providedTool ?? await findBestToolKey(userId, guildId, 'hoe');

    try {
      const result = await runMinigame(userId, guildId, areaKey, level, { toolKey: toolKey ?? undefined });
      const rewards = result.rewards.map(r => r.type === 'coins' ? `🪙 +${r.amount}` : `🌾 ${r.itemKey} x${r.qty}`).join(' · ') || '—';
      const mobs = result.mobs.length ? result.mobs.join(', ') : '—';
      const toolInfo = result.tool?.key ? `🪓 ${result.tool.key}${result.tool.broken ? ' (rota)' : ` (-${result.tool.durabilityDelta} dur.)`}` : '—';
      await message.reply(`🌱 Campo (nivel ${level})
Recompensas: ${rewards}
Eventos: ${mobs}
Herramienta: ${toolInfo}`);
    } catch (e: any) {
      await message.reply(`❌ No se pudo plantar: ${e?.message ?? e}`);
    }
  }
};

