export function getCooldownKeyForFood(
  itemKey: string,
  foodProps: any | undefined
) {
  return foodProps?.cooldownKey ?? `food:${itemKey}`;
}

export function calculateHealingFromFood(
  foodProps: any | undefined,
  maxHp: number
) {
  const flat = Math.max(0, (foodProps?.healHp ?? 0) as number);
  const perc = Math.max(0, (foodProps?.healPercent ?? 0) as number);
  const byPerc = Math.floor((perc / 100) * maxHp);
  return Math.max(1, flat + byPerc);
}
