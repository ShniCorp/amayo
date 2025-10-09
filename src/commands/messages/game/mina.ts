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
import { formatToolLabel, combatSummaryRPG } from "../../../game/lib/rpgFormat";
import { buildAreaMetadataBlocks } from "./_helpers";

const MINING_ACCENT = 0xc27c0e;

export const command: CommandMessage = {
  name: "mina",
  type: "message",
  aliases: ["minar"],
  cooldown: 5,
  description:
    "Ir a la mina (usa pico si está disponible) y obtener recompensas según el nivel.",
  usage: "mina [nivel] [toolKey] [area:clave] (ej: mina 2 tool.pickaxe.basic)",
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const { levelArg, providedTool, areaOverride } = parseGameArgs(args);

    const areaInfo = areaOverride
      ? await resolveGuildAreaWithFallback(guildId, areaOverride)
      : await resolveAreaByType(guildId, "MINE");

    if (!areaInfo.area) {
      if (areaOverride) {
        await message.reply(
          `⚠️ No existe un área con key \`${areaOverride}\` para este servidor.`
        );
      } else {
        await message.reply(
          "⚠️ No hay un área de tipo **MINE** configurada. Crea una con `!area-crear` o especifica `area:<key>`."
        );
      }
      return;
    }

    const { area, source } = areaInfo;
    const globalNotice =
      source === "global"
        ? `ℹ️ Usando configuración global para \`${area.key}\`. Puedes crear \`gameArea\` tipo **MINE** para personalizarla en este servidor.`
        : null;

    const level = levelArg ?? (await getDefaultLevel(userId, guildId, area.id));
    const toolKey =
      providedTool ?? (await findBestToolKey(userId, guildId, "pickaxe"));

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

      // Actualizar stats
      await updateStats(userId, guildId, { minesCompleted: 1 });

      // Actualizar progreso de misiones
      await updateQuestProgress(userId, guildId, "mine_count", 1);

      // Verificar logros
      const newAchievements = await checkAchievements(
        userId,
        guildId,
        "mine_count"
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

      const toolInfo = result.tool?.key
        ? formatToolLabel({
            key: result.tool.key,
            displayName: formatItemLabel(
              rewardItems.get(result.tool.key) ?? {
                key: result.tool.key,
                name: null,
                icon: null,
              },
              { fallbackIcon: "🔧" }
            ),
            instancesRemaining: result.tool.instancesRemaining,
            broken: result.tool.broken,
            brokenInstance: result.tool.brokenInstance,
            durabilityDelta: result.tool.durabilityDelta,
            remaining: result.tool.remaining,
            max: result.tool.max,
            source: result.tool.toolSource,
          })
        : "—";

      const combatSummary = result.combat
        ? combatSummaryRPG({
            mobs: result.mobs.length,
            mobsDefeated: result.combat.mobsDefeated,
            totalDamageDealt: result.combat.totalDamageDealt,
            totalDamageTaken: result.combat.totalDamageTaken,
            playerStartHp: result.combat.playerStartHp,
            playerEndHp: result.combat.playerEndHp,
            outcome: result.combat.outcome,
          })
        : null;

      const blocks = [textBlock("# ⛏️ Mina")];

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

      // Añadir metadata del área (imagen/descripcion) si existe
      const metaBlocks = buildAreaMetadataBlocks(area);
      if (metaBlocks.length) {
        blocks.push(dividerBlock({ divider: false, spacing: 1 }));
        blocks.push(...metaBlocks);
      }

      if (newAchievements.length > 0) {
        blocks.push(dividerBlock({ divider: false, spacing: 2 }));
        const achLines = newAchievements
          .map((ach) => `✨ **${ach.name}** — ${ach.description}`)
          .join("\n");
        blocks.push(textBlock(`🏆 ¡Logro desbloqueado!\n${achLines}`));
      }

      const display = buildDisplay(MINING_ACCENT, blocks);
      await sendDisplayReply(message, display);
    } catch (e: any) {
      await message.reply(`❌ No se pudo minar: ${e?.message ?? e}`);
    }
  },
};
