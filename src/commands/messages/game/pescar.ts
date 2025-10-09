import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { runMinigame } from "../../../game/minigames/service";
import {
  getDefaultLevel,
  findBestToolKey,
  parseGameArgs,
  resolveGuildAreaWithFallback,
  resolveAreaByType,
  sendDisplayReply,
  fetchItemBasics,
  formatItemLabel,
} from "./_helpers";
import { updateStats } from "../../../game/stats/service";
import { updateQuestProgress } from "../../../game/quests/service";
import { checkAchievements } from "../../../game/achievements/service";
import {
  buildDisplay,
  dividerBlock,
  textBlock,
} from "../../../core/lib/componentsV2";
import { buildAreaMetadataBlocks } from "./_helpers";

const FISHING_ACCENT = 0x1abc9c;

export const command: CommandMessage = {
  name: "pescar",
  type: "message",
  aliases: ["fish"],
  cooldown: 5,
  description:
    "Pesca en la laguna (usa caña si está disponible) y obtén recompensas.",
  usage: "pescar [nivel] [toolKey] [area:clave] (ej: pescar 1 tool.rod.basic)",
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const { levelArg, providedTool, areaOverride } = parseGameArgs(args);

    const areaInfo = areaOverride
      ? await resolveGuildAreaWithFallback(guildId, areaOverride)
      : await resolveAreaByType(guildId, "LAGOON");

    if (!areaInfo.area) {
      if (areaOverride) {
        await message.reply(
          `⚠️ No existe un área con key \`${areaOverride}\` para este servidor.`
        );
      } else {
        await message.reply(
          "⚠️ No hay un área de tipo **LAGOON** configurada. Crea una con `!area-crear` o especifica `area:<key>`."
        );
      }
      return;
    }

    const { area, source } = areaInfo;
    const globalNotice =
      source === "global"
        ? `ℹ️ Usando configuración global para \`${area.key}\`. Puedes crear \`gameArea\` tipo **LAGOON** para personalizarla en este servidor.`
        : null;

    const level = levelArg ?? (await getDefaultLevel(userId, guildId, area.id));
    const toolKey =
      providedTool ?? (await findBestToolKey(userId, guildId, "rod"));

    try {
      const result = await runMinigame(userId, guildId, area.key, level, {
        toolKey: toolKey ?? undefined,
      });

      const rewardKeys = result.rewards
        .filter(
          (r): r is { type: "item"; itemKey: string; qty?: number } =>
            r.type === "item" && Boolean(r.itemKey)
        )
        .map((r) => r.itemKey!);
      if (result.tool?.key) rewardKeys.push(result.tool.key);
      const rewardItems = await fetchItemBasics(guildId, rewardKeys);

      // Actualizar stats y misiones
      await updateStats(userId, guildId, { fishingCompleted: 1 });
      await updateQuestProgress(userId, guildId, "fish_count", 1);
      const newAchievements = await checkAchievements(
        userId,
        guildId,
        "fish_count"
      );

      const rewardLines = result.rewards.length
        ? result.rewards
            .map((r) => {
              if (r.type === "coins") return `• 🪙 +${r.amount}`;
              const info = rewardItems.get(r.itemKey!);
              const label = formatItemLabel(
                info ?? { key: r.itemKey!, name: null, icon: null }
              );
              return `• ${label} x${r.qty ?? 1}`;
            })
            .join("\n")
        : "• —";
      const mobsLines = result.mobs.length
        ? result.mobs.map((m) => `• ${m}`).join("\n")
        : "• —";
      const durabilityBar = () => {
        if (
          !result.tool ||
          result.tool.remaining == null ||
          result.tool.max == null
        )
          return "";
        const rem = Math.max(0, result.tool.remaining);
        const max = Math.max(1, result.tool.max);
        const ratio = rem / max;
        const totalSegs = 10;
        const filled = Math.round(ratio * totalSegs);
        const bar = Array.from({ length: totalSegs })
          .map((_, i) => (i < filled ? "█" : "░"))
          .join("");
        return `\nDurabilidad: [${bar}] ${rem}/${max}`;
      };
      const toolInfo = result.tool?.key
        ? (() => {
            const base = formatItemLabel(
              rewardItems.get(result.tool.key) ?? {
                key: result.tool.key,
                name: null,
                icon: null,
              },
              { fallbackIcon: "🎣" }
            );
            if (result.tool.broken) return `${base} (agotada)${durabilityBar()}`;
            if (result.tool.brokenInstance)
              return `${base} (se rompió una instancia, quedan ${result.tool.instancesRemaining}) (-${result.tool.durabilityDelta ?? 0} dur.)${durabilityBar()}`;
            const multi = result.tool.instancesRemaining && result.tool.instancesRemaining > 1 ? ` (x${result.tool.instancesRemaining})` : "";
            return `${base}${multi} (-${result.tool.durabilityDelta ?? 0} dur.)${durabilityBar()}`;
          })()
        : "—";
      const combatSummary = (() => {
        if (!result.combat) return null;
        const c = result.combat;
        return `**Combate**\n• Mobs: ${c.mobs.length} | Derrotados: ${c.mobsDefeated}/${result.mobs.length}\n• Daño hecho: ${c.totalDamageDealt} | Daño recibido: ${c.totalDamageTaken}`;
      })();

      const blocks = [textBlock("# 🎣 Pesca")];

      if (globalNotice) {
        blocks.push(dividerBlock({ divider: false, spacing: 1 }));
        blocks.push(textBlock(globalNotice));
      }

      blocks.push(dividerBlock());
      const areaScope =
        source === "global"
          ? "🌐 Configuración global"
          : "📍 Configuración local";
      blocks.push(
        textBlock(
          `**Área:** \`${area.key}\` • ${areaScope}\n**Nivel:** ${level}\n**Herramienta:** ${toolInfo}`
        )
      );
      blocks.push(dividerBlock({ divider: false, spacing: 1 }));
      blocks.push(textBlock(`**Recompensas**\n${rewardLines}`));
      blocks.push(dividerBlock({ divider: false, spacing: 1 }));
      blocks.push(textBlock(`**Mobs**\n${mobsLines}`));
      if (combatSummary) {
        blocks.push(dividerBlock({ divider: false, spacing: 1 }));
        blocks.push(textBlock(combatSummary));
      }

      // Añadir metadata del área
      const metaBlocks = buildAreaMetadataBlocks(area);
      if (metaBlocks.length) {
        blocks.push(dividerBlock());
        blocks.push(...metaBlocks);
      }

      if (newAchievements.length > 0) {
        blocks.push(dividerBlock({ divider: false, spacing: 2 }));
        const achLines = newAchievements
          .map((ach) => `✨ **${ach.name}** — ${ach.description}`)
          .join("\n");
        blocks.push(textBlock(`🏆 ¡Logro desbloqueado!\n${achLines}`));
      }

      const display = buildDisplay(FISHING_ACCENT, blocks);
      await sendDisplayReply(message, display);
    } catch (e: any) {
      await message.reply(`❌ No se pudo pescar: ${e?.message ?? e}`);
    }
  },
};
