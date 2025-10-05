import { prisma } from '../../core/database/prisma';
import { assertNotOnCooldown, setCooldown } from '../cooldowns/service';
import { findItemByKey, consumeItemByKey } from '../economy/service';
import type { ItemProps } from '../economy/types';
import { getEffectiveStats, adjustHP } from '../combat/equipmentService';

function parseItemProps(json: unknown): ItemProps {
  if (!json || typeof json !== 'object') return {};
  return json as ItemProps;
}

export async function useConsumableByKey(userId: string, guildId: string, itemKey: string) {
  const item = await findItemByKey(guildId, itemKey);
  if (!item) throw new Error('Ítem no encontrado');
  const props = parseItemProps(item.props);
  const food = props.food;
  if (!food) throw new Error('Este ítem no es consumible');

  const cdKey = food.cooldownKey ?? `food:${item.key}`;
  await assertNotOnCooldown(userId, guildId, cdKey);

  // Calcular sanación
  const stats = await getEffectiveStats(userId, guildId);
  const flat = Math.max(0, food.healHp ?? 0);
  const perc = Math.max(0, food.healPercent ?? 0);
  const byPerc = Math.floor((perc / 100) * stats.maxHp);
  const heal = Math.max(1, flat + byPerc);

  // Consumir el ítem
  const { consumed } = await consumeItemByKey(userId, guildId, item.key, 1);
  if (consumed <= 0) throw new Error('No tienes este ítem');

  // Aplicar curación
  await adjustHP(userId, guildId, heal);

  // Setear cooldown si corresponde
  if (food.cooldownSeconds && food.cooldownSeconds > 0) {
    await setCooldown(userId, guildId, cdKey, food.cooldownSeconds);
  }

  return { healed: heal } as const;
}

