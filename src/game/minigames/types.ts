// Tipos para motor de minijuegos (mina, pesca, pelea, plantar).
// JSON flexible: estos tipos solo guían el shape esperado en GameAreaLevel.requirements/rewards/mobs.

export type ToolRequirement = {
  required?: boolean; // si se requiere herramienta
  toolType?: string; // 'pickaxe' | 'rod' | 'sword' | ...
  minTier?: number; // nivel mínimo de herramienta
  allowedKeys?: string[]; // lista blanca de item keys específicos
};

export type LevelRequirements = {
  tool?: ToolRequirement;
  // extensible: stamina, consumibles, roles requeridos, etc.
  [k: string]: unknown;
};

export type WeightedReward =
  | { type: "coins"; amount: number; weight: number }
  | { type: "item"; itemKey: string; qty: number; weight: number };

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
  rewards: Array<{
    type: "coins" | "item";
    amount?: number;
    itemKey?: string;
    qty?: number;
  }>;
  mobs: string[]; // keys de mobs spawneados
  tool?: {
    key?: string;
    durabilityDelta?: number; // cuanto se redujo en esta ejecución
    broken?: boolean; // si se rompió en este uso
    remaining?: number; // durabilidad restante después de aplicar delta (si aplica)
    max?: number; // durabilidad máxima configurada
    brokenInstance?: boolean; // true si solo se rompió una instancia
    instancesRemaining?: number; // instancias que quedan después del uso
    toolSource?: "provided" | "equipped" | "auto"; // origen de la selección
  };
  combat?: CombatSummary; // resumen de combate si hubo mobs y se procesó
};

// --- Combate Básico ---
export type CombatRound = {
  mobKey: string;
  round: number;
  playerDamageDealt: number; // daño infligido al mob en esta ronda
  playerDamageTaken: number; // daño recibido del mob en esta ronda
  mobRemainingHp: number; // hp restante del mob tras la ronda
  mobDefeated?: boolean;
};

export type CombatMobLog = {
  mobKey: string;
  maxHp: number;
  defeated: boolean;
  totalDamageDealt: number;
  totalDamageTakenFromMob: number; // daño que el jugador recibió de este mob
  rounds: CombatRound[];
};

export type CombatSummary = {
  mobs: CombatMobLog[];
  totalDamageDealt: number;
  totalDamageTaken: number;
  mobsDefeated: number;
  victory: boolean; // true si el jugador sobrevivió a todos los mobs
  playerStartHp?: number;
  playerEndHp?: number;
  outcome?: "victory" | "defeat";
  autoDefeatNoWeapon?: boolean; // true si la derrota fue inmediata por no tener arma (damage <= 0)
  deathPenalty?: {
    goldLost?: number;
    fatigueAppliedMinutes?: number;
    fatigueMagnitude?: number; // 0.15 = 15%
    percentApplied?: number; // porcentaje calculado dinámicamente según área/nivel
  };
};
