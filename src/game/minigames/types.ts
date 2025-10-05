// Tipos para motor de minijuegos (mina, pesca, pelea, plantar).
// JSON flexible: estos tipos solo guían el shape esperado en GameAreaLevel.requirements/rewards/mobs.

export type ToolRequirement = {
  required?: boolean; // si se requiere herramienta
  toolType?: string; // 'pickaxe' | 'rod' | 'sword' | ...
  minTier?: number;  // nivel mínimo de herramienta
  allowedKeys?: string[]; // lista blanca de item keys específicos
};

export type LevelRequirements = {
  tool?: ToolRequirement;
  // extensible: stamina, consumibles, roles requeridos, etc.
  [k: string]: unknown;
};

export type WeightedReward =
  | { type: 'coins'; amount: number; weight: number }
  | { type: 'item'; itemKey: string; qty: number; weight: number };

export type RewardsTable = {
  draws?: number; // cuántas extracciones realizar (default 1)
  table: WeightedReward[];
};

export type WeightedMob = { mobKey: string; weight: number };

export type MobsTable = {
  draws?: number; // cuántos mobs intentar spawnear (default 0)
  table: WeightedMob[];
};

export type LevelConfig = {
  requirements?: LevelRequirements;
  rewards?: RewardsTable;
  mobs?: MobsTable;
  // extensible: multiplicadores, riesgos, etc.
  [k: string]: unknown;
};

export type RunMinigameOptions = {
  toolKey?: string; // herramienta elegida por el jugador
};

export type RunResult = {
  success: boolean;
  rewards: Array<{ type: 'coins' | 'item'; amount?: number; itemKey?: string; qty?: number }>;
  mobs: string[]; // keys de mobs spawneados
  tool?: { key?: string; durabilityDelta?: number; broken?: boolean };
};

