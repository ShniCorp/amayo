// Definición declarativa de mobs (scaffolding)
// Futuro: migrar a tabla prisma.mob enriquecida o cache Appwrite.

export interface BaseMobDefinition {
  key: string; // identificador único
  name: string; // nombre visible
  tier: number; // escala de dificultad base
  base: {
    hp: number;
    attack: number;
    defense?: number;
  };
  scaling?: {
    hpPerLevel?: number; // incremento por nivel de área
    attackPerLevel?: number;
    defensePerLevel?: number;
    hpMultiplierPerTier?: number; // multiplicador adicional por tier
  };
  tags?: string[]; // p.ej. ['undead','beast']
  rewardMods?: {
    coinMultiplier?: number;
    extraDropChance?: number; // 0-1
  };
  behavior?: {
    maxRounds?: number; // override límite de rondas
    aggressive?: boolean; // si ataca siempre
    critChance?: number; // 0-1
    critMultiplier?: number; // default 1.5
  };
}

// Ejemplos iniciales - se pueden ir expandiendo
export const MOB_DEFINITIONS: BaseMobDefinition[] = [
  {
    key: "slime.green",
    name: "Slime Verde",
    tier: 1,
    base: { hp: 18, attack: 4 },
    scaling: { hpPerLevel: 3, attackPerLevel: 0.5 },
    tags: ["slime"],
    rewardMods: { coinMultiplier: 0.9 },
    behavior: { maxRounds: 12, aggressive: true },
  },
  {
    key: "skeleton.basic",
    name: "Esqueleto",
    tier: 2,
    base: { hp: 30, attack: 6, defense: 1 },
    scaling: { hpPerLevel: 4, attackPerLevel: 0.8, defensePerLevel: 0.2 },
    tags: ["undead"],
    rewardMods: { coinMultiplier: 1.1, extraDropChance: 0.05 },
    behavior: { aggressive: true, critChance: 0.05, critMultiplier: 1.5 },
  },
];

export function computeMobStats(def: BaseMobDefinition, areaLevel: number) {
  const lvl = Math.max(1, areaLevel);
  const s = def.scaling || {};
  const hp = Math.round(def.base.hp + (s.hpPerLevel ?? 0) * (lvl - 1));
  const atk = +(def.base.attack + (s.attackPerLevel ?? 0) * (lvl - 1)).toFixed(
    2
  );
  const defVal = +(
    (def.base.defense ?? 0) +
    (s.defensePerLevel ?? 0) * (lvl - 1)
  ).toFixed(2);
  return { hp, attack: atk, defense: defVal };
}

/**
 * MobInstance: representación de una entidad mob lista para usarse en combate.
 * - incluye stats escaladas por nivel de área (hp, attack, defense)
 * - preserva la definición base para referencias (name, tier, tags, behavior)
 */
export interface MobInstance {
  key: string;
  name: string;
  tier: number;
  base: BaseMobDefinition["base"];
  scaled: { hp: number; attack: number; defense: number };
  tags?: string[];
  rewardMods?: BaseMobDefinition["rewardMods"];
  behavior?: BaseMobDefinition["behavior"];
}

/**
 * getMobInstance: devuelve una instancia de mob con stats calculadas.
 * Si la definición no existe, devuelve null.
 */
export function getMobInstance(
  key: string,
  areaLevel: number
): MobInstance | null {
  const def = findMobDef(key);
  if (!def) return null;
  const scaled = computeMobStats(def, areaLevel);
  return {
    key: def.key,
    name: def.name,
    tier: def.tier,
    base: def.base,
    scaled,
    tags: def.tags,
    rewardMods: def.rewardMods,
    behavior: def.behavior,
  };
}

export function listMobKeys(): string[] {
  return MOB_DEFINITIONS.map((m) => m.key);
}

// --- DB-backed optional loader + simple validation ---
import { prisma } from "../../core/database/prisma";
import { z } from "zod";

const BaseMobDefinitionSchema = z.object({
  key: z.string(),
  name: z.string(),
  tier: z.number().int().nonnegative(),
  base: z.object({
    hp: z.number(),
    attack: z.number(),
    defense: z.number().optional(),
  }),
  scaling: z
    .object({
      hpPerLevel: z.number().optional(),
      attackPerLevel: z.number().optional(),
      defensePerLevel: z.number().optional(),
      hpMultiplierPerTier: z.number().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  rewardMods: z
    .object({
      coinMultiplier: z.number().optional(),
      extraDropChance: z.number().optional(),
    })
    .optional(),
  behavior: z
    .object({
      maxRounds: z.number().optional(),
      aggressive: z.boolean().optional(),
      critChance: z.number().optional(),
      critMultiplier: z.number().optional(),
    })
    .optional(),
});

// Cache for DB-loaded definitions (key -> def)
const dbMobDefs: Record<string, BaseMobDefinition> = {};

/**
 * Try to refresh mob definitions from the database. This is optional and
 * fails silently if the Prisma model/table doesn't exist or an error occurs.
 * Call this during server startup to load editable mobs.
 */
export async function refreshMobDefinitionsFromDb() {
  try {
    // If no DB configured, skip
    if (!process.env.XATA_DB) return;
    const anyPrisma: any = prisma as any;
    if (!anyPrisma.mob || typeof anyPrisma.mob.findMany !== "function") {
      // Prisma model `mob` not present — skip quietly
      return;
    }
    const rows = await anyPrisma.mob.findMany();
    // rows expected to contain a JSON/config column (we try `config` or `definition`)
    const BaseMobDefinitionSchema = z.object({
      key: z.string(),
      name: z.string(),
      tier: z.number().int().nonnegative(),
      base: z.object({
        hp: z.number(),
        attack: z.number(),
        defense: z.number().optional(),
      }),
      scaling: z
        .object({
          hpPerLevel: z.number().optional(),
          attackPerLevel: z.number().optional(),
          defensePerLevel: z.number().optional(),
          hpMultiplierPerTier: z.number().optional(),
        })
        .optional(),
      tags: z.array(z.string()).optional(),
      rewardMods: z
        .object({
          coinMultiplier: z.number().optional(),
          extraDropChance: z.number().optional(),
        })
        .optional(),
      behavior: z
        .object({
          maxRounds: z.number().optional(),
          aggressive: z.boolean().optional(),
          critChance: z.number().optional(),
          critMultiplier: z.number().optional(),
        })
        .optional(),
    });

    for (const r of rows) {
      // Prisma model Mob stores arbitrary data in `metadata`, but some projects
      // may place structured stats in `stats` or `drops`. Try those fields.
      const cfg =
        r.metadata ??
        r.stats ??
        r.drops ??
        r.config ??
        r.definition ??
        r.data ??
        null;
      if (!cfg || typeof cfg !== "object") continue;
      try {
        const parsed = BaseMobDefinitionSchema.parse(cfg as any);
        dbMobDefs[parsed.key] = parsed as BaseMobDefinition;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(
          "Invalid mob definition in DB for row id=",
          r.id,
          (e as any)?.message ?? e
        );
      }
    }
  } catch (err) {
    // silently ignore DB issues — keep in-memory definitions as source of truth
    // but log to console for debugging
    // eslint-disable-next-line no-console
    console.warn(
      "refreshMobDefinitionsFromDb: could not load mobs from DB:",
      (err && (err as Error).message) || err
    );
  }
}

/**
 * Find mob definition checking DB-loaded defs first, then built-in definitions.
 */
export function findMobDef(key: string) {
  if (dbMobDefs[key]) return dbMobDefs[key];
  return MOB_DEFINITIONS.find((m) => m.key === key) || null;
}

export function validateAllMobDefs() {
  const bad: string[] = [];
  for (const m of MOB_DEFINITIONS) {
    const r = BaseMobDefinitionSchema.safeParse(m);
    if (!r.success) bad.push(m.key ?? "<unknown>");
  }
  for (const k of Object.keys(dbMobDefs)) {
    const r = BaseMobDefinitionSchema.safeParse(dbMobDefs[k]);
    if (!r.success) bad.push(k);
  }
  if (bad.length) {
    // eslint-disable-next-line no-console
    console.warn("validateAllMobDefs: invalid mob defs:", bad);
  }
  return bad.length === 0;
}

/**
 * Initialize mob repository: attempt to refresh from DB and validate definitions.
 * Call this on server start (optional).
 */
export async function initializeMobRepository() {
  await refreshMobDefinitionsFromDb();
  validateAllMobDefs();
}
