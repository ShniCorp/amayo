import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { runMinigame } from '../../../game/minigames/service';
import { resolveArea, getDefaultLevel, findBestToolKey, sendDisplayReply, fetchItemBasics, formatItemLabel } from './_helpers';
import { buildDisplay, dividerBlock, textBlock } from '../../../core/lib/componentsV2';

const FARM_ACCENT = 0x2ECC71;

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

      const rewardKeys = result.rewards
        .filter((r): r is { type: 'item'; itemKey: string; qty?: number } => r.type === 'item' && Boolean(r.itemKey))
        .map((r) => r.itemKey!);
      if (result.tool?.key) rewardKeys.push(result.tool.key);
      const rewardItems = await fetchItemBasics(guildId, rewardKeys);

      const rewardLines = result.rewards.length
        ? result.rewards.map((r) => {
            if (r.type === 'coins') return `• 🪙 +${r.amount}`;
            const info = rewardItems.get(r.itemKey!);
            const label = formatItemLabel(info ?? { key: r.itemKey!, name: null, icon: null });
            return `• ${label} x${r.qty ?? 1}`;
          }).join('\n')
        : '• —';
      const mobsLines = result.mobs.length
        ? result.mobs.map(m => `• ${m}`).join('\n')
        : '• —';
      const toolInfo = result.tool?.key
        ? `${formatItemLabel(rewardItems.get(result.tool.key) ?? { key: result.tool.key, name: null, icon: null }, { fallbackIcon: '🪓' })}${result.tool.broken ? ' (rota)' : ` (-${result.tool.durabilityDelta ?? 0} dur.)`}`
        : '—';

      const blocks = [
        textBlock('# 🌱 Campo'),
        dividerBlock(),
        textBlock(`**Área:** \`${area.key}\`\n**Nivel:** ${level}\n**Herramienta:** ${toolInfo}`),
        dividerBlock({ divider: false, spacing: 1 }),
        textBlock(`**Recompensas**\n${rewardLines}`),
        dividerBlock({ divider: false, spacing: 1 }),
        textBlock(`**Eventos**\n${mobsLines}`),
      ];

      const display = buildDisplay(FARM_ACCENT, blocks);
      await sendDisplayReply(message, display);
    } catch (e: any) {
      await message.reply(`❌ No se pudo plantar: ${e?.message ?? e}`);
    }
  }
};

