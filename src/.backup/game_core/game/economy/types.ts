// Tipos para la capa JSON flexible de economía.
// Estos tipos NO fuerzan el esquema en base de datos, solo sirven para dar seguridad de tipos en el código.

export type PriceItemComponent = {
  itemKey?: string; // preferido para lookup
  itemId?: string; // fallback directo
  qty: number;
};

export type Price = {
  coins?: number;
  items?: PriceItemComponent[];
  extra?: Record<string, unknown>;
};

export type ChestReward =
  | { type: "coins"; amount: number; probability?: number }
  | {
      type: "item";
      itemKey?: string;
      itemId?: string;
      qty: number;
      probability?: number;
    }
  | { type: "role"; roleId: string; probability?: number };

export type PassiveEffect = {
  key: string; // p.ej. "xpBoost", "defenseUp"
  value?: unknown; // libre según tu lógica
  expiresAt?: string; // ISO string opcional
};

export type BreakableProps = {
  enabled?: boolean;
  // Para ítems no apilables, cada instancia puede tener durabilidad independiente
  maxDurability?: number;
  // Opcional: cuánto se reduce por uso/acción
  durabilityPerUse?: number;
};

export type CraftableProps = {
  enabled?: boolean;
};

export type ChestProps = {
  enabled?: boolean;
  // Modo de randomización:
  // 'all' (default): se procesan todas las recompensas y cada una evalúa su probability (si no hay probability, se asume 100%).
  // 'single': selecciona UNA recompensa aleatoria ponderada por probability (o 1 si falta) y solo otorga esa.
  // 'roll-each': similar a 'all' pero probability se trata como chance independiente (igual que all; se mantiene por semántica futura).
  randomMode?: "all" | "single" | "roll-each";
  // Recompensas configuradas
  rewards?: ChestReward[];
  // Roles adicionales fijos (independientes de rewards)
  roles?: string[];
  // Si true, consume 1 del inventario al abrir
  consumeOnOpen?: boolean;
};

export type EventCurrencyProps = {
  enabled?: boolean;
  eventKey?: string; // Identificador del evento
};

export type MutationPolicy = {
  // Lista blanca/negra para mutaciones permitidas
  allowedKeys?: string[];
  deniedKeys?: string[];
};

export type ShopProps = {
  purchasable?: boolean; // si puede venderse en la tienda (además de ShopOffer)
};

export type ToolProps = {
  type: "pickaxe" | "rod" | "sword" | "bow" | "halberd" | "net" | string; // extensible
  tier?: number; // nivel/calidad de la herramienta
};

export type FoodProps = {
  healHp?: number; // sanación plana
  healPercent?: number; // sanación porcentual del maxHp
  cooldownKey?: string; // clave de cooldown personalizada
  cooldownSeconds?: number; // cd para volver a usar
};

export type ItemProps = {
  // Flags y bloques de config opcionales
  breakable?: BreakableProps; // romperse
  craftable?: CraftableProps; // craftear
  chest?: ChestProps; // estilo cofre que al usar da roles/ítems/monedas
  // Si true, este ítem se considera global (guildId = null) y solo el owner del bot puede editarlo
  global?: boolean;
  eventCurrency?: EventCurrencyProps; // puede actuar como moneda de evento
  passiveEffects?: PassiveEffect[]; // efectos por tenerlo
  mutationPolicy?: MutationPolicy; // reglas para mutaciones extra
  craftingOnly?: boolean; // ítem que solo sirve para craftear (p.ej. mineral)
  availableFrom?: string; // ISO para adquirir/usar si deseas sobreescribir a nivel props
  availableTo?: string;
  usableFrom?: string;
  usableTo?: string;
  shop?: ShopProps; // metadatos de tienda
  tool?: ToolProps; // metadatos de herramienta (pico, caña, espada, etc.)
  food?: FoodProps; // metadatos de comida/poción (curación, cooldown)
  // Stats básicos de combate (opcionales)
  damage?: number; // para armas
  defense?: number; // para armaduras
  maxHpBonus?: number; // para capas u otros
  // Cualquier otra extensión libre
  [k: string]: unknown;
};

// Estado por entrada de inventario (InventoryEntry.state)
export type InventoryState = {
  // Para ítems no apilables (stackable=false), puedes manejar varias instancias con durabilidad/expiración por unidad
  instances?: Array<{
    durability?: number;
    expiresAt?: string; // ISO
    notes?: string;
    // Mutaciones aplicadas a esta instancia concreta
    mutations?: string[]; // mutation keys, o ids si prefieres
  }>;
  // Campo libre para tus necesidades
  notes?: string;
  [k: string]: unknown;
};

export type OpenChestResult = {
  coinsDelta: number;
  itemsToAdd: Array<{ itemKey?: string; itemId?: string; qty: number }>;
  rolesToGrant: string[]; // IDs de roles a otorgar
  consumed: boolean; // si el ítem/cofre se consumió
};
