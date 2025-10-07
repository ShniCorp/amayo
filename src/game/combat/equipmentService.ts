import { prisma } from '../../core/database/prisma';
import type { ItemProps } from '../economy/types';
import { ensureUserAndGuildExist } from '../core/userService';

function parseItemProps(json: unknown): ItemProps {
  if (!json || typeof json !== 'object') return {};
  return json as ItemProps;
}

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
  const weapon = eq.weaponItemId ? await prisma.economyItem.findUnique({ where: { id: eq.weaponItemId } }) : null;
  const armor = eq.armorItemId ? await prisma.economyItem.findUnique({ where: { id: eq.armorItemId } }) : null;
  const cape = eq.capeItemId ? await prisma.economyItem.findUnique({ where: { id: eq.capeItemId } }) : null;
  return { eq, weapon, armor, cape } as const;
}

export async function setEquipmentSlot(userId: string, guildId: string, slot: 'weapon'|'armor'|'cape', itemId: string | null) {
  // Asegurar que User y Guild existan antes de crear/actualizar equipment
  await ensureUserAndGuildExist(userId, guildId);
  
  const data = slot === 'weapon' ? { weaponItemId: itemId }
    : slot === 'armor' ? { armorItemId: itemId }
    : { capeItemId: itemId };
  return prisma.playerEquipment.upsert({
    where: { userId_guildId: { userId, guildId } },
    update: data,
    create: { userId, guildId, ...data },
  });
}

export type EffectiveStats = {
  damage: number;
  defense: number;
  maxHp: number;
  hp: number;
};

async function getMutationBonuses(userId: string, guildId: string, itemId?: string | null) {
  if (!itemId) return { damageBonus: 0, defenseBonus: 0, maxHpBonus: 0 };
  const inv = await prisma.inventoryEntry.findUnique({ where: { userId_guildId_itemId: { userId, guildId, itemId } } });
  if (!inv) return { damageBonus: 0, defenseBonus: 0, maxHpBonus: 0 };
  const links = await prisma.inventoryItemMutation.findMany({ where: { inventoryId: inv.id }, include: { mutation: true } });
  let damageBonus = 0, defenseBonus = 0, maxHpBonus = 0;
  for (const l of links) {
    const eff = (l.mutation.effects as any) || {};
    if (typeof eff.damageBonus === 'number') damageBonus += eff.damageBonus;
    if (typeof eff.defenseBonus === 'number') defenseBonus += eff.defenseBonus;
    if (typeof eff.maxHpBonus === 'number') maxHpBonus += eff.maxHpBonus;
  }
  return { damageBonus, defenseBonus, maxHpBonus };
}

export async function getEffectiveStats(userId: string, guildId: string): Promise<EffectiveStats> {
  const state = await ensurePlayerState(userId, guildId);
  const { weapon, armor, cape } = await getEquipment(userId, guildId);
  const w = parseItemProps(weapon?.props);
  const a = parseItemProps(armor?.props);
  const c = parseItemProps(cape?.props);

  const mutW = await getMutationBonuses(userId, guildId, weapon?.id ?? null);
  const mutA = await getMutationBonuses(userId, guildId, armor?.id ?? null);
  const mutC = await getMutationBonuses(userId, guildId, cape?.id ?? null);

  const damage = Math.max(0, (w.damage ?? 0) + mutW.damageBonus);
  const defense = Math.max(0, (a.defense ?? 0) + mutA.defenseBonus);
  const maxHp = Math.max(1, state.maxHp + (c.maxHpBonus ?? 0) + mutC.maxHpBonus);
  const hp = Math.min(state.hp, maxHp);
  return { damage, defense, maxHp, hp };
}

export async function adjustHP(userId: string, guildId: string, delta: number) {
  const state = await ensurePlayerState(userId, guildId);
  const { cape } = await getEquipment(userId, guildId);
  const c = parseItemProps(cape?.props);
  const maxHp = Math.max(1, state.maxHp + (c.maxHpBonus ?? 0));
  const next = Math.min(maxHp, Math.max(0, state.hp + delta));
  return prisma.playerState.update({ where: { userId_guildId: { userId, guildId } }, data: { hp: next, maxHp } });
}
