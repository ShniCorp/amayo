import { prisma } from "../../core/database/prisma";
import {
  addItemByKey,
  adjustCoins,
  findItemByKey,
  getInventoryEntry,
} from "../economy/service";
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
  if (!req) return { toolKeyUsed: undefined as string | undefined };
  const toolReq = req.tool;
  if (!toolReq) return { toolKeyUsed: undefined as string | undefined };

  let toolKeyUsed = toolKey;

  // Auto-select tool when required and not provided
  if (!toolKeyUsed && toolReq.required && toolReq.toolType) {
    toolKeyUsed =
      (await findBestToolKey(userId, guildId, toolReq.toolType, {
        minTier: toolReq.minTier,
        allowedKeys: toolReq.allowedKeys,
      })) ?? undefined;
  }

  // herramienta requerida
  if (toolReq.required && !toolKeyUsed)
    throw new Error("Se requiere una herramienta adecuada");
  if (!toolKeyUsed) return { toolKeyUsed: undefined };

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

  return { toolKeyUsed };
}

async function applyRewards(
  userId: string,
  guildId: string,
  rewards?: RewardsTable
): Promise<RunResult["rewards"]> {
  const results: RunResult["rewards"] = [];
  if (!rewards || !Array.isArray(rewards.table) || rewards.table.length === 0)
    return results;
  const draws = Math.max(1, rewards.draws ?? 1);
  for (let i = 0; i < draws; i++) {
    const pick = pickWeighted(rewards.table);
    if (!pick) continue;
    if (pick.type === "coins") {
      const amt = Math.max(0, pick.amount);
      if (amt > 0) {
        await adjustCoins(userId, guildId, amt);
        results.push({ type: "coins", amount: amt });
      }
    } else if (pick.type === "item") {
      const qty = Math.max(1, pick.qty);
      await addItemByKey(userId, guildId, pick.itemKey, qty);
      results.push({ type: "item", itemKey: pick.itemKey, qty });
    }
  }
  return results;
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
    // eslint-disable-next-line no-console
    console.log(
      `[tool-break] user=${userId} guild=${guildId} toolKey=${toolKey}`
    );
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
  const delivered = await applyRewards(userId, guildId, rewards);
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
    };
  }

  // --- Combate Básico (placeholder) ---
  // Objetivo: procesar mobs spawneados y generar resumen estadístico simple.
  // Futuro: stats jugador, equipo, habilidades. Ahora: valores fijos pseudo-aleatorios.
  let combatSummary: CombatSummary | undefined;
  if (mobsSpawned.length > 0) {
    const mobLogs: CombatSummary["mobs"] = [];
    let totalDealt = 0;
    let totalTaken = 0;
    let defeated = 0;
    const basePlayerAtk = 5 + Math.random() * 3; // placeholder
    const basePlayerDef = 1 + Math.random() * 2; // placeholder
    for (const mobKey of mobsSpawned) {
      // Se podría leer tabla real de mobs (stats json en prisma.mob) en futuro.
      // Por ahora HP aleatorio controlado.
      const maxHp = 8 + Math.floor(Math.random() * 8); // 8-15
      let hp = maxHp;
      const rounds = [] as any[];
      let roundIndex = 1;
      let mobTotalDealt = 0;
      let mobTotalTaken = 0;
      while (hp > 0 && roundIndex <= 10) {
        // limite de 10 rondas por mob
        const playerDamage = Math.max(
          1,
          Math.round(basePlayerAtk + Math.random() * 2)
        );
        hp -= playerDamage;
        mobTotalDealt += playerDamage;
        totalDealt += playerDamage;
        let playerTaken = 0;
        if (hp > 0) {
          // Mob sólo pega si sigue vivo
          const mobAtk = 2 + Math.random() * 3; // 2-5
          const mitigated = Math.max(0, mobAtk - basePlayerDef * 0.5);
          playerTaken = Math.round(mitigated);
          totalTaken += playerTaken;
          mobTotalTaken += playerTaken;
        }
        rounds.push({
          mobKey,
          round: roundIndex,
          playerDamageDealt: playerDamage,
          playerDamageTaken: playerTaken,
          mobRemainingHp: Math.max(0, hp),
          mobDefeated: hp <= 0,
        });
        if (hp <= 0) {
          defeated++;
          break;
        }
        roundIndex++;
      }
      mobLogs.push({
        mobKey,
        maxHp,
        defeated: hp <= 0,
        totalDamageDealt: mobTotalDealt,
        totalDamageTakenFromMob: mobTotalTaken,
        rounds,
      });
    }
    combatSummary = {
      mobs: mobLogs,
      totalDamageDealt: totalDealt,
      totalDamageTaken: totalTaken,
      mobsDefeated: defeated,
      victory: defeated === mobsSpawned.length,
    };
  }

  // Registrar la ejecución
  const resultJson: Prisma.InputJsonValue = {
    rewards: delivered,
    mobs: mobsSpawned,
    tool: toolInfo,
    combat: combatSummary,
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
