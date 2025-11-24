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

const FIGHT_ACCENT = 0x992d22;

export const command: CommandMessage = {
  name: "pelear",
  type: "message",
  aliases: ["fight", "arena"],
  cooldown: 8,
  category: "Minijuegos",
  description: "Entra a la arena y pelea (usa espada si está disponible).",
  usage:
    "pelear [nivel] [toolKey] [area:clave] (ej: pelear 1 weapon.sword.iron)",
  run: async (message, args, _client: Amayo) => {
    const userId = message.author.id;
    const guildId = message.guild!.id;
    const { levelArg, providedTool, areaOverride } = parseGameArgs(args);

    const areaInfo = areaOverride
      ? await resolveGuildAreaWithFallback(guildId, areaOverride)
      : await resolveAreaByType(guildId, "FIGHT");

    if (!areaInfo.area) {
      if (areaOverride) {
        await message.reply(
          `⚠️ No existe un área con key \`${areaOverride}\` para este servidor.`
        );
      } else {
        await message.reply(
          "⚠️ No hay un área de tipo **FIGHT** configurada. Crea una con `!area-crear` o especifica `area:<key>`."
        );
      }
      return;
    }

    const { area, source } = areaInfo;
    const globalNotice =
      source === "global"
        ? `ℹ️ Usando configuración global para \`${area.key}\`. Puedes crear \`gameArea\` tipo **FIGHT** para personalizarla en este servidor.`
        : null;

    const level = levelArg ?? (await getDefaultLevel(userId, guildId, area.id));
    const toolKey =
      providedTool ?? (await findBestToolKey(userId, guildId, "sword"));

    try {
      // Pre-check: si el nivel tiene requirements con herramienta obligatoria
      // intentamos validar rápidamente si existe alguna herramienta equipada o en inventario
      // usando validateRequirements indirectamente sería duplicar lógica; hacemos una ligera comprobación
      // basada en `toolKey` detectado y si findBestToolKey falla, informaremos.
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
      if (result.weaponTool?.key) rewardKeys.push(result.weaponTool.key);
      const rewardItems = await fetchItemBasics(guildId, rewardKeys);

      // Actualizar stats y misiones
      await updateStats(userId, guildId, { fightsCompleted: 1 });
      await updateQuestProgress(userId, guildId, "fight_count", 1);

      // Contar mobs derrotados
      const mobsCount = result.mobs.length;
      if (mobsCount > 0) {
        await updateStats(userId, guildId, { mobsDefeated: mobsCount });
        await updateQuestProgress(
          userId,
          guildId,
          "mob_defeat_count",
          mobsCount
        );
      }

      const newAchievements = await checkAchievements(
        userId,
        guildId,
        "fight_count"
      );

      let rewardLines = result.rewards.length
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
      if (result.rewardModifiers?.baseCoinsAwarded != null) {
        const { baseCoinsAwarded, coinsAfterPenalty, fatigueCoinMultiplier } =
          result.rewardModifiers;
        if (
          fatigueCoinMultiplier != null &&
          fatigueCoinMultiplier < 1 &&
          baseCoinsAwarded != null &&
          coinsAfterPenalty != null
        ) {
          const pct = Math.round((1 - fatigueCoinMultiplier) * 100);
          rewardLines += `\n  (⚠️ Fatiga: monedas base ${baseCoinsAwarded} → ${coinsAfterPenalty} (-${pct}%) )`;
        }
      }
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
              { fallbackIcon: "🗡️" }
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

      const blocks = [textBlock("# ⚔️ Arena")];

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
          `**Área:** \`${area.key}\` • ${areaScope}\n**Nivel:** ${level}\n**Arma:** ${toolInfo}`
        )
      );
      blocks.push(dividerBlock({ divider: false, spacing: 1 }));
      blocks.push(textBlock(`**Recompensas**\n${rewardLines}`));
      blocks.push(dividerBlock({ divider: false, spacing: 1 }));
      blocks.push(textBlock(`**Enemigos**\n${mobsLines}`));
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

      const display = buildDisplay(FIGHT_ACCENT, blocks);
      await sendDisplayReply(message, display);
    } catch (e: any) {
      const msg = (e?.message || String(e)).toLowerCase();
      // Mapear errores conocidos a mensajes más amigables
      if (
        msg.includes("area no encontrada") ||
        msg.includes("nivel no encontrado")
      ) {
        await message.reply(
          "⚠️ El área o nivel especificado no existe para este servidor."
        );
        return;
      }
      if (msg.includes("cooldown activo")) {
        await message.reply(
          "⏳ Estás en cooldown para esta actividad. Intenta más tarde."
        );
        return;
      }
      if (
        msg.includes("se requiere una herramienta adecuada") ||
        msg.includes("no tienes la herramienta") ||
        msg.includes("tipo de herramienta incorrecto") ||
        msg.includes("tier de herramienta insuficiente")
      ) {
        // Mensaje más específico: si no hay arma equipada y el área requiere saberlo, sugerir equipar o conseguir herramienta
        await message.reply(
          "⚠️ No tienes una herramienta válida para esta actividad. Equipa una herramienta adecuada (ej: espada) o especifica `toolKey`."
        );
        return;
      }
      if (
        msg.includes("no puede infligir daño") ||
        msg.includes("autoDefeatNoWeapon") ||
        msg.includes("auto defeat")
      ) {
        await message.reply(
          "⚠️ No tienes un arma equipada o válida para pelear. Equipa un arma para poder infligir daño o usa `pelear <toolKey>` con una herramienta válida."
        );
        return;
      }
      // Fallback genérico
      await message.reply(`❌ No se pudo pelear: ${e?.message ?? e}`);
    }
  },
};
