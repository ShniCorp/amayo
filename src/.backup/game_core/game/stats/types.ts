export interface StatsUpdate {
  // Minijuegos
  minesCompleted?: number;
  fishingCompleted?: number;
  fightsCompleted?: number;
  farmsCompleted?: number;

  // Combate
  mobsDefeated?: number;
  damageDealt?: number;
  damageTaken?: number;
  timesDefeated?: number;

  // Economía
  totalCoinsEarned?: number;
  totalCoinsSpent?: number;
  itemsCrafted?: number;
  itemsSmelted?: number;
  itemsPurchased?: number;

  // Items
  chestsOpened?: number;
  itemsConsumed?: number;
  itemsEquipped?: number;

  // Récords
  highestDamageDealt?: number;
  longestWinStreak?: number;
  currentWinStreak?: number;
  mostCoinsAtOnce?: number;
}

export type StatCategory = 
  | 'minesCompleted'
  | 'fishingCompleted'
  | 'fightsCompleted'
  | 'farmsCompleted'
  | 'mobsDefeated'
  | 'damageDealt'
  | 'totalCoinsEarned'
  | 'itemsCrafted';
