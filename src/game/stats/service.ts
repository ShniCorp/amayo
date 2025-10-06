import { prisma } from '../../core/database/prisma';
import type { Prisma } from '@prisma/client';
import logger from '../../core/lib/logger';

/**
 * Obtener o crear las estadísticas de un jugador
 */
export async function getOrCreatePlayerStats(userId: string, guildId: string) {
  let stats = await prisma.playerStats.findUnique({
    where: { userId_guildId: { userId, guildId } }
  });

  if (!stats) {
    stats = await prisma.playerStats.create({
      data: { userId, guildId }
    });
  }

  return stats;
}

/**
 * Actualizar estadísticas del jugador
 */
export async function updateStats(
  userId: string,
  guildId: string,
  updates: Partial<Omit<Prisma.PlayerStatsUpdateInput, 'user' | 'guild' | 'createdAt' | 'updatedAt'>>
) {
  try {
    await getOrCreatePlayerStats(userId, guildId);

    const updateData: Prisma.PlayerStatsUpdateInput = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === null) continue;

      if (typeof value === 'number') {
        (updateData as Record<string, any>)[key] = { increment: value };
      } else {
        (updateData as Record<string, any>)[key] = value;
      }
    }

    const stats = await prisma.playerStats.update({
      where: { userId_guildId: { userId, guildId } },
      data: updateData
    });

    // Verificar récords
    if (updates.damageDealt && typeof updates.damageDealt === 'number') {
      if (updates.damageDealt > stats.highestDamageDealt) {
        await prisma.playerStats.update({
          where: { userId_guildId: { userId, guildId } },
          data: { highestDamageDealt: updates.damageDealt }
        });
      }
    }

    return stats;
  } catch (error) {
    console.error(`Error updating stats for ${userId} in ${guildId}:`, error);
    throw error;
  }
}

/**
 * Incrementar contador específico
 */
export async function incrementStat(
  userId: string,
  guildId: string,
  stat: string,
  amount: number = 1
) {
  await getOrCreatePlayerStats(userId, guildId);

  return await prisma.playerStats.update({
    where: { userId_guildId: { userId, guildId } },
    data: { [stat]: { increment: amount } }
  });
}

/**
 * Obtener leaderboard por categoría
 */
export async function getLeaderboard(
  guildId: string,
  category: keyof Omit<Prisma.PlayerStatsCreateInput, 'user' | 'guild'>,
  limit: number = 10
) {
  const stats = await prisma.playerStats.findMany({
    where: { guildId },
    orderBy: { [category]: 'desc' },
    take: limit,
    include: {
      user: true
    }
  });

  return stats.filter(s => (s[category] as number) > 0);
}

/**
 * Obtener estadísticas de un jugador con formato amigable
 */
export async function getPlayerStatsFormatted(userId: string, guildId: string) {
  const stats = await getOrCreatePlayerStats(userId, guildId);

  return {
    activities: {
      '⛏️ Minas': stats.minesCompleted,
      '🎣 Pesca': stats.fishingCompleted,
      '⚔️ Combates': stats.fightsCompleted,
      '🌾 Granja': stats.farmsCompleted
    },
    combat: {
      '👾 Mobs Derrotados': stats.mobsDefeated,
      '💥 Daño Infligido': stats.damageDealt,
      '🩹 Daño Recibido': stats.damageTaken,
      '💀 Veces Derrotado': stats.timesDefeated,
      '🏆 Racha de Victorias': stats.currentWinStreak,
      '⭐ Mejor Racha': stats.longestWinStreak
    },
    economy: {
      '💰 Monedas Ganadas': stats.totalCoinsEarned,
      '💸 Monedas Gastadas': stats.totalCoinsSpent,
      '🛠️ Items Crafteados': stats.itemsCrafted,
      '🔥 Items Fundidos': stats.itemsSmelted,
      '🛒 Items Comprados': stats.itemsPurchased
    },
    items: {
      '📦 Cofres Abiertos': stats.chestsOpened,
      '🍖 Items Consumidos': stats.itemsConsumed,
      '⚔️ Items Equipados': stats.itemsEquipped
    },
    records: {
      '💥 Mayor Daño': stats.highestDamageDealt,
      '💰 Más Monedas': stats.mostCoinsAtOnce
    }
  };
}

/**
 * Resetear estadísticas de un jugador
 */
export async function resetPlayerStats(userId: string, guildId: string) {
  return await prisma.playerStats.update({
    where: { userId_guildId: { userId, guildId } },
    data: {
      minesCompleted: 0,
      fishingCompleted: 0,
      fightsCompleted: 0,
      farmsCompleted: 0,
      mobsDefeated: 0,
      damageDealt: 0,
      damageTaken: 0,
      timesDefeated: 0,
      totalCoinsEarned: 0,
      totalCoinsSpent: 0,
      itemsCrafted: 0,
      itemsSmelted: 0,
      itemsPurchased: 0,
      chestsOpened: 0,
      itemsConsumed: 0,
      itemsEquipped: 0,
      highestDamageDealt: 0,
      longestWinStreak: 0,
      currentWinStreak: 0,
      mostCoinsAtOnce: 0
    }
  });
}
