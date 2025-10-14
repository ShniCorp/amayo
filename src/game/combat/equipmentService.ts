import { prisma } from "../../core/database/prisma";
import {
  getActiveStatusEffects,
  computeDerivedModifiers,
} from "./statusEffectsService";
import type { ItemProps } from "../economy/types";
import { ensureUserAndGuildExist } from "../core/userService";
import { parseItemProps } from "../core/utils";

export async function ensurePlayerState(userId: string, guildId: string) {
  // Asegurar que User y Guild existan antes de crear/buscar state
  await ensureUserAndGuildExist(userId, guildId);

  return prisma.playerState.upsert({
    where: { userId_guildId: { userId, guildId } },
    update: {},
    create: { userId, guildId },
  });
}

export async function getEquipment(userId: string, guildId: string) {
  // Asegurar que User y Guild existan antes de crear/buscar equipment
  await ensureUserAndGuildExist(userId, guildId);

  const eq = await prisma.playerEquipment.upsert({
    where: { userId_guildId: { userId, guildId } },
    update: {},
    create: { userId, guildId },
  });
  const weapon = eq.weaponItemId
    ? await prisma.economyItem.findUnique({ where: { id: eq.weaponItemId } })
    : null;
  const armor = eq.armorItemId
    ? await prisma.economyItem.findUnique({ where: { id: eq.armorItemId } })
    : null;
  const cape = eq.capeItemId
    ? await prisma.economyItem.findUnique({ where: { id: eq.capeItemId } })
    : null;
  return { eq, weapon, armor, cape } as const;
}

export async function setEquipmentSlot(
  userId: string,
  guildId: string,
  slot: "weapon" | "armor" | "cape",
  itemId: string | null
) {
  // Asegurar que User y Guild existan antes de crear/actualizar equipment
  await ensureUserAndGuildExist(userId, guildId);

  const data =
    slot === "weapon"
      ? { weaponItemId: itemId }
      : slot === "armor"
      ? { armorItemId: itemId }
      : { capeItemId: itemId };
  return prisma.playerEquipment.upsert({
    where: { userId_guildId: { userId, guildId } },
    update: data,
    create: { userId, guildId, ...data },
  });
}

export type EffectiveStats = {
  damage: number; // daño efectivo (con racha + efectos)
  defense: number; // defensa efectiva (con efectos)
  maxHp: number;
  hp: number;
  baseDamage?: number; // daño base antes de status effects
  baseDefense?: number; // defensa base antes de status effects
};

async function getMutationBonuses(
  userId: string,
  guildId: string,
  itemId?: string | null
) {
  if (!itemId) return { damageBonus: 0, defenseBonus: 0, maxHpBonus: 0 };
  const inv = await prisma.inventoryEntry.findUnique({
    where: { userId_guildId_itemId: { userId, guildId, itemId } },
  });
  if (!inv) return { damageBonus: 0, defenseBonus: 0, maxHpBonus: 0 };
  const links = await prisma.inventoryItemMutation.findMany({
    where: { inventoryId: inv.id },
    include: { mutation: true },
  });
  let damageBonus = 0,
    defenseBonus = 0,
    maxHpBonus = 0;
  for (const l of links) {
    const eff = (l.mutation.effects as any) || {};
    if (typeof eff.damageBonus === "number") damageBonus += eff.damageBonus;
    if (typeof eff.defenseBonus === "number") defenseBonus += eff.defenseBonus;
    if (typeof eff.maxHpBonus === "number") maxHpBonus += eff.maxHpBonus;
  }
  return { damageBonus, defenseBonus, maxHpBonus };
}

export async function getEffectiveStats(
  userId: string,
  guildId: string
): Promise<EffectiveStats> {
  const state = await ensurePlayerState(userId, guildId);
  const { weapon, armor, cape } = await getEquipment(userId, guildId);
  const w = parseItemProps(weapon?.props);
  const a = parseItemProps(armor?.props);
  const c = parseItemProps(cape?.props);

  const mutW = await getMutationBonuses(userId, guildId, weapon?.id ?? null);
  const mutA = await getMutationBonuses(userId, guildId, armor?.id ?? null);
  const mutC = await getMutationBonuses(userId, guildId, cape?.id ?? null);

  let damage = Math.max(0, (w.damage ?? 0) + mutW.damageBonus);
  const defenseBase = Math.max(0, (a.defense ?? 0) + mutA.defenseBonus);
  const maxHp = Math.max(
    1,
    state.maxHp + (c.maxHpBonus ?? 0) + mutC.maxHpBonus
  );
  const hp = Math.min(state.hp, maxHp);
  // Buff por racha de victorias: 1% daño extra cada 3 victorias consecutivas (cap 30%)
  try {
    const stats = await prisma.playerStats.findUnique({
      where: { userId_guildId: { userId, guildId } },
    });
    if (stats) {
      const streak = stats.currentWinStreak || 0;
      const steps = Math.floor(streak / 3);
      const bonusPct = Math.min(steps * 0.01, 0.3); // cap 30%
      if (bonusPct > 0)
        damage = Math.max(0, Math.round(damage * (1 + bonusPct)));
    }
  } catch {
    // silencioso: si falla stats no bloquea
  }
  // Aplicar efectos de estado activos (FATIGUE etc.)
  try {
    const effects = await getActiveStatusEffects(userId, guildId);
    if (effects.length) {
      const { damageMultiplier, defenseMultiplier } = computeDerivedModifiers(
        effects.map((e) => ({ type: e.type, magnitude: e.magnitude }))
      );
      const baseDamage = damage;
      const baseDefense = defenseBase;
      damage = Math.max(0, Math.round(damage * damageMultiplier));
      const adjustedDefense = Math.max(
        0,
        Math.round(defenseBase * defenseMultiplier)
      );
      return {
        damage,
        defense: adjustedDefense,
        maxHp,
        hp,
        baseDamage,
        baseDefense,
      };
    }
  } catch {
    // silencioso
  }
  return {
    damage,
    defense: defenseBase,
    maxHp,
    hp,
    baseDamage: damage,
    baseDefense: defenseBase,
  };
}

export async function adjustHP(userId: string, guildId: string, delta: number) {
  const state = await ensurePlayerState(userId, guildId);
  const { cape } = await getEquipment(userId, guildId);
  const c = parseItemProps(cape?.props);
  const maxHp = Math.max(1, state.maxHp + (c.maxHpBonus ?? 0));
  const next = Math.min(maxHp, Math.max(0, state.hp + delta));
  return prisma.playerState.update({
    where: { userId_guildId: { userId, guildId } },
    data: { hp: next, maxHp },
  });
}
