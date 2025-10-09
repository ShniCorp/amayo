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

export function findMobDef(key: string) {
  return MOB_DEFINITIONS.find((m) => m.key === key) || null;
}

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
