import { prisma } from '../../core/database/prisma';
import { giveRewards, type Reward } from '../rewards/service';
import logger from '../../core/lib/logger';
import { ensureUserAndGuildExist } from '../core/userService';

/**
 * Obtener o crear racha del jugador
 */
export async function getOrCreateStreak(userId: string, guildId: string) {
  // Asegurar que User y Guild existan antes de crear/buscar streak
  await ensureUserAndGuildExist(userId, guildId);
  
  let streak = await prisma.playerStreak.findUnique({
    where: { userId_guildId: { userId, guildId } }
  });

  if (!streak) {
    streak = await prisma.playerStreak.create({
      data: {
        userId,
        guildId,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: new Date(),
        totalDaysActive: 0
      }
    });
  }

  return streak;
}

/**
 * Actualizar racha diaria del jugador
 */
export async function updateStreak(userId: string, guildId: string) {
  try {
    const streak = await getOrCreateStreak(userId, guildId);
    const now = new Date();
    const lastActive = new Date(streak.lastActiveDate);

    // Resetear hora para comparar solo la fecha
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

    const daysDiff = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

    // Ya actualizó hoy
    if (daysDiff === 0) {
      return { streak, newDay: false, rewards: null };
    }

    let newStreak = streak.currentStreak;
    
    // Si pasó 1 día exacto, incrementar racha
    if (daysDiff === 1) {
      newStreak = streak.currentStreak + 1;
    }
    // Si pasó más de 1 día, resetear racha
    else if (daysDiff > 1) {
      newStreak = 1;
    }

    // Actualizar longest streak si es necesario
    const newLongest = Math.max(streak.longestStreak, newStreak);

    const updated = await prisma.playerStreak.update({
      where: { userId_guildId: { userId, guildId } },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActiveDate: now,
        totalDaysActive: { increment: 1 }
      }
    });

    // Obtener recompensa del día
    const reward = getStreakReward(newStreak);

    // Dar recompensas
    if (reward) {
      await giveRewards(userId, guildId, reward, `streak:day${newStreak}`);
    }

    return { 
      streak: updated, 
      newDay: true, 
      rewards: reward,
      daysIncreased: daysDiff === 1
    };
  } catch (error) {
    console.error(`Error updating streak for ${userId}:`, error);
    throw error;
  }
}

/**
 * Obtener recompensa según el día de racha
 */
export function getStreakReward(day: number): Reward | null {
  // Recompensas especiales por día
  const specialDays: Record<number, Reward> = {
    1: { coins: 100 },
    3: { coins: 300 },
    5: { coins: 500 },
    7: { coins: 1000 },
    10: { coins: 1500 },
    14: { coins: 2500 },
    21: { coins: 5000 },
    30: { coins: 10000 },
    60: { coins: 25000 },
    90: { coins: 50000 },
    180: { coins: 100000 },
    365: { coins: 500000 }
  };

  // Si hay recompensa especial para este día
  if (specialDays[day]) {
    return specialDays[day];
  }

  // Recompensa base diaria (escala con el día)
  const baseCoins = 50;
  const bonus = Math.floor(day / 7) * 50; // +50 monedas cada 7 días
  
  return {
    coins: baseCoins + bonus
  };
}

/**
 * Obtener información de la racha con recompensas próximas
 */
export async function getStreakInfo(userId: string, guildId: string) {
  const streak = await getOrCreateStreak(userId, guildId);
  const now = new Date();
  const lastActive = new Date(streak.lastActiveDate);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());

  const daysDiff = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

  // Calcular si la racha está activa o expiró
  const isActive = daysDiff <= 1;
  const willExpireSoon = daysDiff === 0; // Ya jugó hoy

  // Próxima recompensa especial
  const specialDays = [1, 3, 5, 7, 10, 14, 21, 30, 60, 90, 180, 365];
  const nextMilestone = specialDays.find(d => d > streak.currentStreak) || null;

  return {
    streak,
    isActive,
    willExpireSoon,
    daysDiff,
    nextMilestone,
    nextMilestoneIn: nextMilestone ? nextMilestone - streak.currentStreak : null,
    todayReward: getStreakReward(streak.currentStreak + 1)
  };
}

/**
 * Resetear racha de un jugador (admin)
 */
export async function resetStreak(userId: string, guildId: string) {
  return await prisma.playerStreak.update({
    where: { userId_guildId: { userId, guildId } },
    data: {
      currentStreak: 0,
      lastActiveDate: new Date()
    }
  });
}
