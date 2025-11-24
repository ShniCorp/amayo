import { findMobDef } from "../mobs/mobData";

export function pickDropFromDef(
  def: any
): { itemKey: string; qty: number } | null {
  if (!def) return null;
  const drops = def.drops ?? def.rewards ?? null;
  if (!drops) return null;
  if (Array.isArray(drops) && drops.length > 0) {
    const total = drops.reduce(
      (s: number, d: any) => s + (Number(d.weight) || 1),
      0
    );
    let r = Math.random() * total;
    for (const d of drops) {
      const w = Number(d.weight) || 1;
      r -= w;
      if (r <= 0) return { itemKey: d.itemKey, qty: Number(d.qty) || 1 };
    }
    return {
      itemKey: drops[drops.length - 1].itemKey,
      qty: Number(drops[drops.length - 1].qty) || 1,
    };
  }
  if (typeof drops === "object") {
    const keys = Object.keys(drops || {});
    if (keys.length === 0) return null;
    const sel = keys[Math.floor(Math.random() * keys.length)];
    return { itemKey: sel, qty: Number(drops[sel]) || 1 };
  }
  return null;
}
