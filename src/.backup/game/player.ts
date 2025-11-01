import type { CommandMessage } from "../../../core/types/commands";
import type Amayo from "../../../core/client";
import { prisma } from "../../../core/database/prisma";
import { getOrCreateWallet } from "../../../game/economy/service";
import {
  getEquipment,
  getEffectiveStats,
} from "../../../game/combat/equipmentService";
import {
  getPlayerStatsFormatted,
  getOrCreatePlayerStats,
} from "../../../game/stats/service";
import type { TextBasedChannel } from "discord.js";
import { formatItemLabel } from "./_helpers";
import { heartsBar } from "../../../game/lib/rpgFormat";
import { getActiveStatusEffects } from "../../../game/combat/statusEffectsService";

export const command: CommandMessage = {
  name: "player",
  type: "message",
  aliases: ["perfil", "profile", "yo", "me"],
  cooldown: 5,
  category: "Economía",
  description:
    "Muestra toda tu información de jugador con vista visual mejorada",
  usage: "player [@usuario]",
  run: async (message, args, _client: Amayo) => {
    const targetUser = message.mentions.users.first() || message.author;
    const userId = targetUser.id;
    const guildId = message.guild!.id;

    // Obtener datos del jugador
    const wallet = await getOrCreateWallet(userId, guildId);
    const { eq, weapon, armor, cape } = await getEquipment(userId, guildId);
    const stats = await getEffectiveStats(userId, guildId);
    const showDefense =
      stats.baseDefense != null && stats.baseDefense !== stats.defense
        ? `${stats.defense} (_${stats.baseDefense}_ base)`
        : `${stats.defense}`;
    const showDamage =
      stats.baseDamage != null && stats.baseDamage !== stats.damage
        ? `${stats.damage} (_${stats.baseDamage}_ base)`
        : `${stats.damage}`;
    const playerStats = await getPlayerStatsFormatted(userId, guildId);
    const rawStats = await getOrCreatePlayerStats(userId, guildId);
    const streak = rawStats.currentWinStreak;
    const streakBonusPct = Math.min(Math.floor(streak / 3), 30); // cada 3 = 1%, mostramos valor base en %
    const damageBonusDisplay =
      streakBonusPct > 0 ? `(+${streakBonusPct}% racha)` : "";
    const effects = await getActiveStatusEffects(userId, guildId);

    // Progreso por áreas
    const progress = await prisma.playerProgress.findMany({
      where: { userId, guildId },
      include: { area: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    });

    // Inventario
    const inventoryCount = await prisma.inventoryEntry.count({
      where: { userId, guildId, quantity: { gt: 0 } },
    });

    const inventorySum = await prisma.inventoryEntry.aggregate({
      where: { userId, guildId },
      _sum: { quantity: true },
    });

    // Cooldowns activos
    const activeCooldowns = await prisma.actionCooldown.findMany({
      where: { userId, guildId, until: { gt: new Date() } },
      orderBy: { until: "asc" },
      take: 3,
    });

    const weaponLine = weapon
      ? `⚔️ Arma: ${formatItemLabel(weapon, {
          fallbackIcon: "🗡️",
          bold: true,
        })}`
      : "⚔️ Arma: *Ninguna*";
    const armorLine = armor
      ? `🛡️ Armadura: ${formatItemLabel(armor, {
          fallbackIcon: "🛡️",
          bold: true,
        })}`
      : "🛡️ Armadura: *Ninguna*";
    const capeLine = cape
      ? `🧥 Capa: ${formatItemLabel(cape, { fallbackIcon: "🧥", bold: true })}`
      : "🧥 Capa: *Ninguna*";

    // Crear DisplayComponent
    const display = {
      type: 17,
      accent_color: 0x5865f2,
      components: [
        {
          type: 10,
          content: `👤 **${targetUser.username}**\n${
            targetUser.bot ? "🤖 Bot" : "👨 Usuario"
          }`,
        },
        { type: 14, divider: true },
        {
          type: 10,
          content:
            `**<:stats:1425689271788113991> ESTADÍSTICAS**\n` +
            `<:healbonus:1425671499792121877> HP: **${stats.hp}/${
              stats.maxHp
            }** ${heartsBar(stats.hp, stats.maxHp)}\n` +
            `<:damage:1425670476449189998> ATK: **${showDamage}** ${damageBonusDisplay}\n` +
            `<:defens:1425670433910427862> DEF: **${showDefense}**\n` +
            `🏆 Racha: **${streak}** (mejor: ${rawStats.longestWinStreak})\n` +
            `<a:9470coin:1425694135607885906> Monedas: **${wallet.coins.toLocaleString()}**`,
        },
        { type: 14, divider: true },
        {
          type: 10,
          content:
            `**<:damage:1425670476449189998> EQUIPO**\n` +
            `${weaponLine}\n` +
            `${armorLine}\n` +
            `${capeLine}`,
        },
        { type: 14, divider: true },
        {
          type: 10,
          content:
            `**🎒 INVENTARIO**\n` +
            `<:emptybox:1425678700753588305> Items únicos: **${inventoryCount}**\n` +
            `<:table:1425673712312782879> Total items: **${
              inventorySum._sum.quantity ?? 0
            }**`,
        },
      ],
    };

    // Añadir efectos activos (después de construir el bloque base para mantener orden)
    if (effects.length > 0) {
      const nowTs = Date.now();
      const fxLines = effects
        .map((e) => {
          let remain = "";
          if (e.expiresAt) {
            const ms = e.expiresAt.getTime() - nowTs;
            if (ms > 0) {
              const m = Math.floor(ms / 60000);
              const s = Math.floor((ms % 60000) / 1000);
              remain = ` (${m}m ${s}s)`;
            } else remain = " (exp)";
          }
          switch (e.type) {
            case "FATIGUE": {
              const pct = Math.round(e.magnitude * 100);
              return `• Fatiga: -${pct}% daño${remain}`;
            }
            default:
              return `• ${e.type}${remain}`;
          }
        })
        .join("\n");
      display.components.push({ type: 14, divider: true });
      display.components.push({
        type: 10,
        content: `**😵 EFECTOS ACTIVOS**\n${fxLines}`,
      });
    }

    // Añadir stats de actividades si existen
    if (playerStats.activities) {
      const activitiesText = Object.entries(playerStats.activities)
        .filter(([_, value]) => value > 0)
        .map(([key, value]) => `${key}: **${value}**`)
        .join("\n");

      if (activitiesText) {
        display.components.push({ type: 14, divider: true });
        display.components.push({
          type: 10,
          content: `**🎮 ACTIVIDADES**\n${activitiesText}`,
        });
      }
    }

    // Añadir progreso por áreas
    if (progress.length > 0) {
      display.components.push({ type: 14, divider: true });
      display.components.push({
        type: 10,
        content:
          `**🗺️ PROGRESO EN ÁREAS**\n` +
          progress
            .map(
              (p) =>
                `• ${p.area.name || p.area.key}: Nivel **${p.highestLevel}**`
            )
            .join("\n"),
      });
    }

    // Añadir cooldowns activos
    if (activeCooldowns.length > 0) {
      const now = Date.now();
      const cooldownsText = activeCooldowns
        .map((cd) => {
          const remaining = Math.ceil((cd.until.getTime() - now) / 1000);
          const mins = Math.floor(remaining / 60);
          const secs = remaining % 60;
          return `• ${cd.key}: **${mins}m ${secs}s**`;
        })
        .join("\n");

      display.components.push({ type: 14, divider: true });
      display.components.push({
        type: 10,
        content: `**<:swordcooldown:1425695375028912168> COOLDOWNS ACTIVOS**\n${cooldownsText}`,
      });
    }

    const channel = message.channel as TextBasedChannel & { send: Function };
    await (channel.send as any)({
      content: null,
      components: [display],
      flags: 32768, // MessageFlags.IS_COMPONENTS_V2
      reply: { messageReference: message.id },
    });
  },
};
