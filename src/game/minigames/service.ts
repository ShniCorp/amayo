import {
  applyDeathFatigue,
  getActiveStatusEffects,
} from "../combat/statusEffectsService";
import { getOrCreateWallet } from "../economy/service";
import { prisma } from "../../core/database/prisma";
import {
  addItemByKey,
  adjustCoins,
  findItemByKey,
  getInventoryEntry,
} from "../economy/service";
import {
  getEffectiveStats,
  adjustHP,
  ensurePlayerState,
} from "../combat/equipmentService"; // 🟩 local authoritative
import { logToolBreak } from "../lib/toolBreakLog";
import { updateStats } from "../stats/service"; // 🟩 local authoritative
import type { ItemProps, InventoryState } from "../economy/types";
import type {
  LevelRequirements,
  RunMinigameOptions,
  RunResult,
  RewardsTable,
  MobsTable,
  CombatSummary,
} from "./types";
import type { Prisma } from "@prisma/client";

// Escalado dinámico de penalización por derrota según área/nivel y riesgo.
// Se puede ampliar leyendo area.metadata.riskFactor (0-3) y level.
function computeDeathPenaltyPercent(
  area: { key: string; metadata: any },
  level: number
): number {
  const meta = (area.metadata as any) || {};
  const base = 0.05; // 5% base
  const risk =
    typeof meta.riskFactor === "number"
      ? Math.max(0, Math.min(3, meta.riskFactor))
      : 0;
  const levelBoost = Math.min(0.1, Math.max(0, (level - 1) * 0.005)); // +0.5% por nivel adicional hasta +10%
  const riskBoost = risk * 0.02; // cada punto riesgo +2%
  let pct = base + levelBoost + riskBoost;
  if (pct > 0.25) pct = 0.25; // cap 25%
  return pct; // ej: 0.08 = 8%
}

// Auto-select best tool from inventory by type and constraints
async function findBestToolKey(
  userId: string,
  guildId: string,
  toolType: string,
  opts?: { minTier?: number; allowedKeys?: string[] }
) {
  const entries = await prisma.inventoryEntry.findMany({
    where: { userId, guildId, quantity: { gt: 0 } },
    include: { item: true },
  });
  let best: { key: string; tier: number } | null = null;
  for (const e of entries) {
    const props = parseItemProps(e.item.props);
    const t = props.tool;
    if (!t || t.type !== toolType) continue;
    const tier = Math.max(0, t.tier ?? 0);
    if (opts?.minTier != null && tier < opts.minTier) continue;
    if (
      opts?.allowedKeys &&
      opts.allowedKeys.length &&
      !opts.allowedKeys.includes(e.item.key)
    )
      continue;
    if (!best || tier > best.tier) best = { key: e.item.key, tier };
  }
  return best?.key ?? null;
}

function parseJSON<T>(v: unknown): T | null {
  if (!v || (typeof v !== "object" && typeof v !== "string")) return null;
  return v as T;
}

function pickWeighted<T extends { weight: number }>(arr: T[]): T | null {
  const total = arr.reduce((s, a) => s + Math.max(0, a.weight || 0), 0);
  if (total <= 0) return null;
  const r = Math.random() * total;
  let acc = 0;
  for (const a of arr) {
    acc += Math.max(0, a.weight || 0);
    if (r <= acc) return a;
  }
  return arr[arr.length - 1] ?? null;
}

async function ensureAreaAndLevel(
  guildId: string,
  areaKey: string,
  level: number
) {
  const area = await prisma.gameArea.findFirst({
    where: { key: areaKey, OR: [{ guildId }, { guildId: null }] },
    orderBy: [{ guildId: "desc" }],
  });
  if (!area) throw new Error("Área no encontrada");
  const lvl = await prisma.gameAreaLevel.findFirst({
    where: { areaId: area.id, level },
  });
  if (!lvl) throw new Error("Nivel no encontrado");
  return { area, lvl } as const;
}

function parseItemProps(json: unknown): ItemProps {
  if (!json || typeof json !== "object") return {};
  return json as ItemProps;
}

function parseInvState(json: unknown): InventoryState {
  if (!json || typeof json !== "object") return {};
  return json as InventoryState;
}

async function validateRequirements(
  userId: string,
  guildId: string,
  req?: LevelRequirements,
  toolKey?: string
) {
  if (!req)
    return {
      toolKeyUsed: undefined as string | undefined,
      toolSource: undefined as "provided" | "equipped" | "auto" | undefined,
    };
  const toolReq = req.tool;
  if (!toolReq)
    return {
      toolKeyUsed: undefined as string | undefined,
      toolSource: undefined,
    };

  let toolKeyUsed = toolKey;
  let toolSource: "provided" | "equipped" | "auto" | undefined = undefined;
  if (toolKeyUsed) toolSource = "provided";

  // Auto-select tool when required and not provided
  if (!toolKeyUsed && toolReq.required && toolReq.toolType) {
    // 1. Intentar herramienta equipada en slot weapon si coincide el tipo
    const equip = await prisma.playerEquipment.findUnique({
      where: { userId_guildId: { userId, guildId } },
      include: { weaponItem: true } as any,
    });
    if (equip?.weaponItemId && equip?.weaponItem) {
      const wProps = parseItemProps((equip as any).weaponItem.props);
      if (wProps.tool?.type === toolReq.toolType) {
        const tier = Math.max(0, wProps.tool?.tier ?? 0);
        if (
          (toolReq.minTier == null || tier >= toolReq.minTier) &&
          (!toolReq.allowedKeys ||
            toolReq.allowedKeys.includes((equip as any).weaponItem.key))
        ) {
          toolKeyUsed = (equip as any).weaponItem.key;
          toolSource = "equipped";
        }
      }
    }
    // 2. Best inventory si no se obtuvo del equipo
    if (!toolKeyUsed) {
      const best = await findBestToolKey(userId, guildId, toolReq.toolType, {
        minTier: toolReq.minTier,
        allowedKeys: toolReq.allowedKeys,
      });
      if (best) {
        toolKeyUsed = best;
        toolSource = "auto";
      }
    }
  }

  // herramienta requerida
  if (toolReq.required && !toolKeyUsed)
    throw new Error("Se requiere una herramienta adecuada");
  if (!toolKeyUsed) return { toolKeyUsed: undefined, toolSource };

  // verificar herramienta
  const toolItem = await findItemByKey(guildId, toolKeyUsed);
  if (!toolItem) throw new Error("Herramienta no encontrada");
  const { entry } = await getInventoryEntry(userId, guildId, toolKeyUsed);
  if (!entry || (entry.quantity ?? 0) <= 0)
    throw new Error("No tienes la herramienta");

  const props = parseItemProps(toolItem.props);
  const tool = props.tool;
  if (toolReq.toolType && tool?.type !== toolReq.toolType)
    throw new Error("Tipo de herramienta incorrecto");
  if (toolReq.minTier != null && (tool?.tier ?? 0) < toolReq.minTier)
    throw new Error("Tier de herramienta insuficiente");
  if (toolReq.allowedKeys && !toolReq.allowedKeys.includes(toolKeyUsed))
    throw new Error("Esta herramienta no es válida para esta área");

  return { toolKeyUsed, toolSource };
}

async function applyRewards(
  userId: string,
  guildId: string,
  rewards?: RewardsTable
): Promise<{
  rewards: RunResult["rewards"];
  modifiers?: RunResult["rewardModifiers"];
}> {
  const results: RunResult["rewards"] = [];
  if (!rewards || !Array.isArray(rewards.table) || rewards.table.length === 0)
    return { rewards: results };

  // Detectar efecto FATIGUE activo para penalizar SOLO monedas.
  let fatigueMagnitude: number | undefined;
  try {
    const effects = await getActiveStatusEffects(userId, guildId);
    const fatigue = effects.find((e) => e.type === "FATIGUE");
    if (fatigue && typeof fatigue.magnitude === "number") {
      fatigueMagnitude = Math.max(0, Math.min(0.9, fatigue.magnitude));
    }
  } catch {
    // silencioso
  }
  const coinMultiplier = fatigueMagnitude
    ? Math.max(0, 1 - fatigueMagnitude)
    : 1;

  const draws = Math.max(1, rewards.draws ?? 1);
  for (let i = 0; i < draws; i++) {
    const pick = pickWeighted(rewards.table);
    if (!pick) continue;
    if (pick.type === "coins") {
      const baseAmt = Math.max(0, pick.amount);
      if (baseAmt > 0) {
        const adjusted = Math.max(0, Math.floor(baseAmt * coinMultiplier));
        const finalAmt = coinMultiplier < 1 && adjusted === 0 ? 1 : adjusted; // al menos 1 si había algo base
        if (finalAmt > 0) {
          await adjustCoins(userId, guildId, finalAmt);
          results.push({ type: "coins", amount: finalAmt });
        }
      }
    } else if (pick.type === "item") {
      const qty = Math.max(1, pick.qty);
      await addItemByKey(userId, guildId, pick.itemKey, qty);
      results.push({ type: "item", itemKey: pick.itemKey, qty });
    }
  }
  const modifiers =
    coinMultiplier < 1
      ? { fatigueCoinMultiplier: coinMultiplier, fatigueMagnitude }
      : undefined;
  return { rewards: results, modifiers };
}

async function sampleMobs(mobs?: MobsTable): Promise<string[]> {
  const out: string[] = [];
  if (!mobs || !Array.isArray(mobs.table) || mobs.table.length === 0)
    return out;
  const draws = Math.max(0, mobs.draws ?? 0);
  for (let i = 0; i < draws; i++) {
    const pick = pickWeighted(mobs.table);
    if (pick) out.push(pick.mobKey);
  }
  return out;
}

async function reduceToolDurability(
  userId: string,
  guildId: string,
  toolKey: string
) {
  const { item, entry } = await getInventoryEntry(userId, guildId, toolKey);
  if (!entry)
    return {
      broken: false,
      brokenInstance: false,
      delta: 0,
      remaining: undefined,
      max: undefined,
      instancesRemaining: 0,
    } as const;
  const props = parseItemProps(item.props);
  const breakable = props.breakable;
  // Si el item no es breakable o la durabilidad está deshabilitada, no hacemos nada
  if (!breakable || breakable.enabled === false) {
    return {
      broken: false,
      brokenInstance: false,
      delta: 0,
      remaining: undefined,
      max: undefined,
      instancesRemaining: entry.quantity ?? 0,
    } as const;
  }

  // Valores base
  const maxConfigured = Math.max(1, breakable.maxDurability ?? 1);
  let perUse = Math.max(1, breakable.durabilityPerUse ?? 1);

  // Protección: si perUse > maxDurability asumimos configuración errónea y lo reducimos a 1
  // (en lugar de romper inmediatamente el ítem). Si quieres que se rompa de un uso, define maxDurability igual a 1.
  if (perUse > maxConfigured) perUse = 1;
  const delta = perUse;
  if (item.stackable) {
    // Herramientas deberían ser no apilables; si lo son, solo decrementamos cantidad como fallback
    const consumed = Math.min(1, entry.quantity);
    let broken = false;
    if (consumed > 0) {
      const updated = await prisma.inventoryEntry.update({
        where: { userId_guildId_itemId: { userId, guildId, itemId: item.id } },
        data: { quantity: { decrement: consumed } },
      });
      // Consideramos "rota" sólo si después de consumir ya no queda ninguna unidad
      broken = (updated.quantity ?? 0) <= 0;
    }
    return {
      broken,
      brokenInstance: broken,
      delta,
      remaining: undefined,
      max: maxConfigured,
      instancesRemaining: broken ? 0 : (entry.quantity ?? 1) - 1,
    } as const;
  }
  const state = parseInvState(entry.state);
  state.instances ??= [{}];
  if (state.instances.length === 0) state.instances.push({});
  // Seleccionar instancia: ahora usamos la primera, en futuro se puede elegir la de mayor durabilidad restante
  const inst = state.instances[0];
  const max = maxConfigured; // ya calculado arriba
  // Si la instancia no tiene durabilidad inicial, la inicializamos
  if (inst.durability == null) (inst as any).durability = max;
  const current = Math.min(Math.max(0, inst.durability ?? max), max);
  const next = current - delta;
  let brokenInstance = false;
  if (next <= 0) {
    // romper sólo esta instancia
    state.instances.shift();
    brokenInstance = true;
  } else {
    (inst as any).durability = next;
    state.instances[0] = inst;
  }
  const instancesRemaining = state.instances.length;
  const broken = instancesRemaining === 0; // Ítem totalmente agotado
  await prisma.inventoryEntry.update({
    where: { userId_guildId_itemId: { userId, guildId, itemId: item.id } },
    data: {
      state: state as unknown as Prisma.InputJsonValue,
      quantity: state.instances.length,
    },
  });
  // Placeholder: logging de ruptura (migrar a ToolBreakLog futuro)
  if (brokenInstance) {
    logToolBreak({
      ts: Date.now(),
      userId,
      guildId,
      toolKey,
      brokenInstance: !broken, // true = solo una instancia
      instancesRemaining,
    });
  }
  return {
    broken,
    brokenInstance,
    delta,
    remaining: broken ? 0 : next,
    max,
    instancesRemaining,
  } as const;
}

export { reduceToolDurability };

export async function runMinigame(
  userId: string,
  guildId: string,
  areaKey: string,
  level: number,
  opts?: RunMinigameOptions
): Promise<RunResult> {
  const { area, lvl } = await ensureAreaAndLevel(guildId, areaKey, level);

  // Cooldown por área
  const areaConf = (area.config as any) ?? {};
  const cdSeconds = Math.max(0, Number(areaConf.cooldownSeconds ?? 0));
  const cdKey = `minigame:${area.key}`;
  if (cdSeconds > 0) {
    const existing = await prisma.actionCooldown.findUnique({
      where: { userId_guildId_key: { userId, guildId, key: cdKey } },
    });
    if (existing && existing.until > new Date()) {
      throw new Error("Cooldown activo para esta actividad");
    }
  }

  // Leer configuración de nivel (requirements, rewards, mobs)
  const requirements = parseJSON<LevelRequirements>(lvl.requirements) ?? {};
  const rewards = parseJSON<RewardsTable>(lvl.rewards) ?? { table: [] };
  const mobs = parseJSON<MobsTable>(lvl.mobs) ?? { table: [] };

  // Validar herramienta si aplica
  const reqRes = await validateRequirements(
    userId,
    guildId,
    requirements,
    opts?.toolKey
  );

  // Aplicar recompensas y samplear mobs
  const { rewards: delivered, modifiers: rewardModifiers } = await applyRewards(
    userId,
    guildId,
    rewards
  );
  const mobsSpawned = await sampleMobs(mobs);

  // Reducir durabilidad de herramienta si se usó
  let toolInfo: RunResult["tool"] | undefined;
  if (reqRes.toolKeyUsed) {
    const t = await reduceToolDurability(userId, guildId, reqRes.toolKeyUsed);
    toolInfo = {
      key: reqRes.toolKeyUsed,
      durabilityDelta: t.delta,
      broken: t.broken,
      remaining: t.remaining,
      max: t.max,
      brokenInstance: t.brokenInstance,
      instancesRemaining: t.instancesRemaining,
      toolSource: reqRes.toolSource ?? (opts?.toolKey ? "provided" : "auto"),
    };
  }

  // (Eliminado combate placeholder; sustituido por sistema integrado más abajo)
  // --- Combate Integrado con Equipo y HP Persistente ---
  let combatSummary: CombatSummary | undefined;
  if (mobsSpawned.length > 0) {
    // Obtener stats efectivos del jugador (arma = daño, armadura = defensa, capa = maxHp extra + mutaciones)
    const eff = await getEffectiveStats(userId, guildId);
    const playerState = await ensurePlayerState(userId, guildId);
    const startHp = eff.hp; // HP actual persistente
    // Regla: si el jugador no tiene arma (damage <=0) no puede infligir daño real y perderá automáticamente contra cualquier mob.
    // En lugar de simular rondas irreales con daño mínimo artificial, forzamos derrota directa manteniendo coherencia.
    if (!eff.damage || eff.damage <= 0) {
      // Registrar derrota simple contra la lista de mobs (no se derrotan mobs).
      const mobLogs: CombatSummary["mobs"] = mobsSpawned.map((mk) => ({
        mobKey: mk,
        maxHp: 0,
        defeated: false,
        totalDamageDealt: 0,
        totalDamageTakenFromMob: 0,
        rounds: [],
      }));
      // Aplicar daño simulado: mobs atacan una vez (opcional). Aquí asumimos que el jugador cae a 0 directamente para simplificar.
      const endHp = Math.max(1, Math.floor(eff.maxHp * 0.5));
      await adjustHP(userId, guildId, endHp - playerState.hp); // regen al 50%
      await updateStats(userId, guildId, {
        damageTaken: 0, // opcional: podría ponerse un valor fijo si quieres penalizar
        timesDefeated: 1,
      } as any);
      // Reset de racha si existía
      await prisma.playerStats.update({
        where: { userId_guildId: { userId, guildId } },
        data: { currentWinStreak: 0 },
      });
      // Penalizaciones por derrota: pérdida de oro + fatiga
      let deathPenalty: CombatSummary["deathPenalty"] | undefined;
      try {
        const wallet = await getOrCreateWallet(userId, guildId);
        const coins = wallet.coins;
        const percent = computeDeathPenaltyPercent(area, level);
        let goldLost = 0;
        if (coins > 0) {
          goldLost = Math.floor(coins * percent);
          if (goldLost < 1) goldLost = 1;
          if (goldLost > 5000) goldLost = 5000; // nuevo cap más alto por riesgo escalado
          if (goldLost > coins) goldLost = coins; // no perder más de lo que tienes
          if (goldLost > 0) {
            await prisma.economyWallet.update({
              where: { userId_guildId: { userId, guildId } },
              data: { coins: { decrement: goldLost } },
            });
          }
        }
        // Fatiga escalada: base 15%, +1% cada 5 de racha previa (cap +10%)
        let previousStreak = 0;
        try {
          const ps = await prisma.playerStats.findUnique({
            where: { userId_guildId: { userId, guildId } },
          });
          previousStreak = ps?.currentWinStreak || 0;
        } catch {}
        const extraFatigue = Math.min(
          0.1,
          Math.floor(previousStreak / 5) * 0.01
        );
        const fatigueMagnitude = 0.15 + extraFatigue;
        const fatigueMinutes = 5;
        await applyDeathFatigue(
          userId,
          guildId,
          fatigueMagnitude,
          fatigueMinutes
        );
        deathPenalty = {
          goldLost,
          fatigueAppliedMinutes: fatigueMinutes,
          fatigueMagnitude,
          percentApplied: percent,
        };
        try {
          await prisma.deathLog.create({
            data: {
              userId,
              guildId,
              areaId: area.id,
              areaKey: area.key,
              level,
              goldLost: goldLost || 0,
              percentApplied: percent,
              autoDefeatNoWeapon: true,
              fatigueMagnitude,
              fatigueMinutes,
              metadata: {},
            },
          });
        } catch {}
        combatSummary = {
          mobs: mobLogs,
          totalDamageDealt: 0,
          totalDamageTaken: 0,
          mobsDefeated: 0,
          victory: false,
          playerStartHp: startHp,
          playerEndHp: endHp,
          outcome: "defeat",
          autoDefeatNoWeapon: true,
          deathPenalty,
        };
      } catch {
        combatSummary = {
          mobs: mobLogs,
          totalDamageDealt: 0,
          totalDamageTaken: 0,
          mobsDefeated: 0,
          victory: false,
          playerStartHp: startHp,
          playerEndHp: endHp,
          outcome: "defeat",
          autoDefeatNoWeapon: true,
        };
      }
    } else {
      let currentHp = startHp;
      const mobLogs: CombatSummary["mobs"] = [];
      let totalDealt = 0;
      let totalTaken = 0;
      let totalMobsDefeated = 0;
      // Variación de ±20%
      const variance = (base: number) => {
        const factor = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
        return base * factor;
      };
      for (const mobKey of mobsSpawned) {
        if (currentHp <= 0) break; // jugador derrotado antes de iniciar este mob
        // Stats simples del mob (placeholder mejorable con tabla real)
        const mobBaseHp = 10 + Math.floor(Math.random() * 6); // 10-15
        let mobHp = mobBaseHp;
        const rounds: any[] = [];
        let round = 1;
        let mobDamageDealt = 0; // daño que jugador hace a este mob
        let mobDamageTakenFromMob = 0; // daño que jugador recibe de este mob
        while (mobHp > 0 && currentHp > 0 && round <= 12) {
          // Daño jugador -> mob
          const playerRaw = variance(eff.damage || 1) + 1; // asegurar >=1
          const playerDamage = Math.max(1, Math.round(playerRaw));
          mobHp -= playerDamage;
          mobDamageDealt += playerDamage;
          totalDealt += playerDamage;
          let playerTaken = 0;
          if (mobHp > 0) {
            const mobAtkBase = 3 + Math.random() * 4; // 3-7
            const mobAtk = variance(mobAtkBase);
            // Mitigación por defensa => defensa reduce linealmente hasta 60% cap
            const mitigationRatio = Math.min(0.6, (eff.defense || 0) * 0.05); // 5% por punto defensa hasta 60%
            const mitigated = mobAtk * (1 - mitigationRatio);
            playerTaken = Math.max(0, Math.round(mitigated));
            if (playerTaken > 0) {
              currentHp = Math.max(0, currentHp - playerTaken);
              mobDamageTakenFromMob += playerTaken;
              totalTaken += playerTaken;
            }
          }
          rounds.push({
            mobKey,
            round,
            playerDamageDealt: playerDamage,
            playerDamageTaken: playerTaken,
            mobRemainingHp: Math.max(0, mobHp),
            mobDefeated: mobHp <= 0,
          });
          if (mobHp <= 0) {
            totalMobsDefeated++;
            break;
          }
          if (currentHp <= 0) break;
          round++;
        }
        mobLogs.push({
          mobKey,
          maxHp: mobBaseHp,
          defeated: mobHp <= 0,
          totalDamageDealt: mobDamageDealt,
          totalDamageTakenFromMob: mobDamageTakenFromMob,
          rounds,
        });
        if (currentHp <= 0) break; // fin combate global
      }
      const victory = currentHp > 0 && totalMobsDefeated === mobsSpawned.length;
      // Persistir HP (si derrota -> regenerar al 50% del maxHp, regla confirmada por usuario)
      let endHp = currentHp;
      let defeatedNow = false;
      if (currentHp <= 0) {
        defeatedNow = true;
        const regen = Math.max(1, Math.floor(eff.maxHp * 0.5));
        endHp = regen;
        await adjustHP(userId, guildId, regen - playerState.hp); // set a 50% (delta relativo)
      } else {
        // almacenar HP restante real
        await adjustHP(userId, guildId, currentHp - playerState.hp);
      }
      // Actualizar estadísticas
      const statUpdates: Record<string, number> = {};
      if (area.key.startsWith("mine")) statUpdates.minesCompleted = 1;
      if (area.key.startsWith("lagoon")) statUpdates.fishingCompleted = 1;
      if (
        area.key.startsWith("arena") ||
        area.key.startsWith("battle") ||
        area.key.includes("fight")
      )
        statUpdates.fightsCompleted = 1;
      if (totalMobsDefeated > 0) statUpdates.mobsDefeated = totalMobsDefeated;
      if (totalDealt > 0) statUpdates.damageDealt = totalDealt;
      if (totalTaken > 0) statUpdates.damageTaken = totalTaken;
      if (defeatedNow) statUpdates.timesDefeated = 1;
      // Rachas de victoria
      if (victory) {
        statUpdates.currentWinStreak = 1; // increment
      } else if (defeatedNow) {
        // reset current streak
        // No podemos hacer decrement directo, así que setearemos manual luego
      }
      await updateStats(userId, guildId, statUpdates as any);
      if (defeatedNow) {
        await prisma.playerStats.update({
          where: { userId_guildId: { userId, guildId } },
          data: { currentWinStreak: 0 },
        });
        // Penalizaciones por derrota
        let deathPenalty: CombatSummary["deathPenalty"] | undefined;
        try {
          const wallet = await getOrCreateWallet(userId, guildId);
          const coins = wallet.coins;
          const percent = computeDeathPenaltyPercent(area, level);
          let goldLost = 0;
          if (coins > 0) {
            goldLost = Math.floor(coins * percent);
            if (goldLost < 1) goldLost = 1;
            if (goldLost > 5000) goldLost = 5000;
            if (goldLost > coins) goldLost = coins;
            if (goldLost > 0) {
              await prisma.economyWallet.update({
                where: { userId_guildId: { userId, guildId } },
                data: { coins: { decrement: goldLost } },
              });
            }
          }
          // Fatiga escalada
          let previousStreak = 0;
          try {
            const ps = await prisma.playerStats.findUnique({
              where: { userId_guildId: { userId, guildId } },
            });
            previousStreak = ps?.currentWinStreak || 0;
          } catch {}
          const extraFatigue = Math.min(
            0.1,
            Math.floor(previousStreak / 5) * 0.01
          );
          const fatigueMagnitude = 0.15 + extraFatigue;
          const fatigueMinutes = 5;
          await applyDeathFatigue(
            userId,
            guildId,
            fatigueMagnitude,
            fatigueMinutes
          );
          deathPenalty = {
            goldLost,
            fatigueAppliedMinutes: fatigueMinutes,
            fatigueMagnitude,
            percentApplied: percent,
          };
          try {
            await prisma.deathLog.create({
              data: {
                userId,
                guildId,
                areaId: area.id,
                areaKey: area.key,
                level,
                goldLost: goldLost || 0,
                percentApplied: percent,
                autoDefeatNoWeapon: false,
                fatigueMagnitude,
                fatigueMinutes,
                metadata: { mobs: totalMobsDefeated },
              },
            });
          } catch {}
        } catch {
          // silencioso
        }
        combatSummary = {
          mobs: mobLogs,
          totalDamageDealt: totalDealt,
          totalDamageTaken: totalTaken,
          mobsDefeated: totalMobsDefeated,
          victory,
          playerStartHp: startHp,
          playerEndHp: endHp,
          outcome: "defeat",
          deathPenalty,
        };
      } else {
        if (victory) {
          await prisma.$executeRawUnsafe(
            `UPDATE "PlayerStats" SET "longestWinStreak" = GREATEST("longestWinStreak", "currentWinStreak") WHERE "userId" = $1 AND "guildId" = $2`,
            userId,
            guildId
          );
        }
        combatSummary = {
          mobs: mobLogs,
          totalDamageDealt: totalDealt,
          totalDamageTaken: totalTaken,
          mobsDefeated: totalMobsDefeated,
          victory,
          playerStartHp: startHp,
          playerEndHp: endHp,
          outcome: victory ? "victory" : "defeat",
        };
      }
    }
  }

  // Registrar la ejecución
  const resultJson: Prisma.InputJsonValue = {
    rewards: delivered,
    mobs: mobsSpawned,
    tool: toolInfo,
    combat: combatSummary,
    rewardModifiers,
    notes: "auto",
  } as unknown as Prisma.InputJsonValue;

  await prisma.minigameRun.create({
    data: {
      userId,
      guildId,
      areaId: area.id,
      level,
      toolItemId: null, // opcional si decides guardar id del item herramienta
      success: true,
      result: resultJson,
    },
  });

  // Progreso del jugador
  await prisma.playerProgress.upsert({
    where: { userId_guildId_areaId: { userId, guildId, areaId: area.id } },
    create: {
      userId,
      guildId,
      areaId: area.id,
      highestLevel: Math.max(1, level),
    },
    update: { highestLevel: { set: level } },
  });

  // Setear cooldown
  if (cdSeconds > 0) {
    await prisma.actionCooldown.upsert({
      where: { userId_guildId_key: { userId, guildId, key: cdKey } },
      update: { until: new Date(Date.now() + cdSeconds * 1000) },
      create: {
        userId,
        guildId,
        key: cdKey,
        until: new Date(Date.now() + cdSeconds * 1000),
      },
    });
  }

  return {
    success: true,
    rewards: delivered,
    mobs: mobsSpawned,
    tool: toolInfo,
    combat: combatSummary,
    rewardModifiers,
  };
}

// Convenience wrappers with auto-level (from PlayerProgress) and auto-tool selection inside validateRequirements
export async function runMining(
  userId: string,
  guildId: string,
  level?: number,
  toolKey?: string
) {
  const area = await prisma.gameArea.findFirst({
    where: { key: "mine.cavern", OR: [{ guildId }, { guildId: null }] },
    orderBy: [{ guildId: "desc" }],
  });
  if (!area) throw new Error("Área de mina no configurada");
  const lvl =
    level ??
    (
      await prisma.playerProgress.findUnique({
        where: { userId_guildId_areaId: { userId, guildId, areaId: area.id } },
      })
    )?.highestLevel ??
    1;
  return runMinigame(userId, guildId, "mine.cavern", Math.max(1, lvl), {
    toolKey,
  });
}

export async function runFishing(
  userId: string,
  guildId: string,
  level?: number,
  toolKey?: string
) {
  const area = await prisma.gameArea.findFirst({
    where: { key: "lagoon.shore", OR: [{ guildId }, { guildId: null }] },
    orderBy: [{ guildId: "desc" }],
  });
  if (!area) throw new Error("Área de laguna no configurada");
  const lvl =
    level ??
    (
      await prisma.playerProgress.findUnique({
        where: { userId_guildId_areaId: { userId, guildId, areaId: area.id } },
      })
    )?.highestLevel ??
    1;
  return runMinigame(userId, guildId, "lagoon.shore", Math.max(1, lvl), {
    toolKey,
  });
}
