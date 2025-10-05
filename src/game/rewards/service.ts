import { prisma } from '../../core/database/prisma';
import { addItemByKey, adjustCoins } from '../economy/service';
import logger from '../../core/lib/logger';

export interface Reward {
  coins?: number;
  items?: Array<{ key: string; quantity: number }>;
  xp?: number;
  title?: string;
}

/**
 * Dar recompensas a un jugador
 */
export async function giveRewards(
  userId: string,
  guildId: string,
  rewards: Reward,
  source: string
): Promise<string[]> {
  const results: string[] = [];

  try {
    // Monedas
    if (rewards.coins && rewards.coins > 0) {
      await adjustCoins(userId, guildId, rewards.coins);
      results.push(`💰 **${rewards.coins.toLocaleString()}** monedas`);
    }

    // Items
    if (rewards.items && rewards.items.length > 0) {
      for (const item of rewards.items) {
        await addItemByKey(userId, guildId, item.key, item.quantity);
        results.push(`📦 **${item.quantity}x** ${item.key}`);
      }
    }

    // XP (por implementar si tienes sistema de XP)
    if (rewards.xp && rewards.xp > 0) {
      results.push(`⭐ **${rewards.xp}** XP`);
    }

    // Título (por implementar)
    if (rewards.title) {
      results.push(`🏆 Título: **${rewards.title}**`);
    }

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        guildId,
        action: 'reward_given',
        target: source,
        details: rewards as any
      }
    }).catch(() => {}); // Silencioso si falla el log

    console.log(`Rewards given to ${userId} in ${guildId} from ${source}:`, rewards);

    return results;
  } catch (error) {
    console.error(`Error giving rewards to ${userId} in ${guildId}:`, error);
    throw error;
  }
}

/**
 * Validar que las recompensas sean válidas
 */
export function validateRewards(rewards: any): rewards is Reward {
  if (typeof rewards !== 'object' || rewards === null) return false;

  if (rewards.coins !== undefined && (typeof rewards.coins !== 'number' || rewards.coins < 0)) {
    return false;
  }

  if (rewards.items !== undefined) {
    if (!Array.isArray(rewards.items)) return false;
    for (const item of rewards.items) {
      if (!item.key || typeof item.key !== 'string') return false;
      if (typeof item.quantity !== 'number' || item.quantity <= 0) return false;
    }
  }

  if (rewards.xp !== undefined && (typeof rewards.xp !== 'number' || rewards.xp < 0)) {
    return false;
  }

  if (rewards.title !== undefined && typeof rewards.title !== 'string') {
    return false;
  }

  return true;
}
