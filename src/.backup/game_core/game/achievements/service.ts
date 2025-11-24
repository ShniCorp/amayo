import { prisma } from '../../core/database/prisma';
import { giveRewards, type Reward } from '../rewards/service';
import { getOrCreatePlayerStats } from '../stats/service';
import logger from '../../core/lib/logger';
import { ensureUserAndGuildExist } from '../core/userService';

/**
 * Verificar y desbloquear logros según un trigger
 */
export async function checkAchievements(
  userId: string,
  guildId: string,
  trigger: string
): Promise<any[]> {
  try {
    // Asegurar que User y Guild existan antes de buscar achievements
    await ensureUserAndGuildExist(userId, guildId);
    
    // Obtener todos los logros del servidor que no estén desbloqueados
    const achievements = await prisma.achievement.findMany({
      where: {
        OR: [{ guildId }, { guildId: null }],
        unlocked: {
          none: {
            userId,
            guildId,
            unlockedAt: { not: null }
          }
        }
      }
    });

    const newUnlocks: any[] = [];
    const stats = await getOrCreatePlayerStats(userId, guildId);

    for (const achievement of achievements) {
      const req = achievement.requirements as any;
      
      // Verificar si el trigger coincide
      if (req.type !== trigger) continue;

      // Obtener o crear progreso del logro
      let progress = await prisma.playerAchievement.findUnique({
        where: {
          userId_guildId_achievementId: {
            userId,
            guildId,
            achievementId: achievement.id
          }
        }
      });

      if (!progress) {
        progress = await prisma.playerAchievement.create({
          data: {
            userId,
            guildId,
            achievementId: achievement.id,
            progress: 0
          }
        });
      }

      // Ya desbloqueado
      if (progress.unlockedAt) continue;

      // Obtener el valor actual según el tipo de requisito
      let currentValue = 0;
      switch (req.type) {
        case 'mine_count':
          currentValue = stats.minesCompleted;
          break;
        case 'fish_count':
          currentValue = stats.fishingCompleted;
          break;
        case 'fight_count':
          currentValue = stats.fightsCompleted;
          break;
        case 'farm_count':
          currentValue = stats.farmsCompleted;
          break;
        case 'mob_defeat_count':
          currentValue = stats.mobsDefeated;
          break;
        case 'craft_count':
          currentValue = stats.itemsCrafted;
          break;
        case 'coins_earned':
          currentValue = stats.totalCoinsEarned;
          break;
        case 'damage_dealt':
          currentValue = stats.damageDealt;
          break;
        default:
          continue;
      }

      // Actualizar progreso
      await prisma.playerAchievement.update({
        where: { id: progress.id },
        data: { progress: currentValue }
      });

      // Verificar si se desbloqueó
      if (currentValue >= req.value) {
        await prisma.playerAchievement.update({
          where: { id: progress.id },
          data: { 
            unlockedAt: new Date(),
            progress: req.value
          }
        });

        // Dar recompensas si las hay
        if (achievement.rewards) {
          await giveRewards(userId, guildId, achievement.rewards as Reward, `achievement:${achievement.key}`);
        }

        newUnlocks.push(achievement);
      }
    }

    return newUnlocks;
  } catch (error) {
    console.error(`Error checking achievements for ${userId}:`, error);
    return [];
  }
}

/**
 * Obtener logros desbloqueados de un jugador
 */
export async function getPlayerAchievements(userId: string, guildId: string) {
  const unlocked = await prisma.playerAchievement.findMany({
    where: {
      userId,
      guildId,
      unlockedAt: { not: null }
    },
    include: {
      achievement: true
    },
    orderBy: {
      unlockedAt: 'desc'
    }
  });

  const inProgress = await prisma.playerAchievement.findMany({
    where: {
      userId,
      guildId,
      unlockedAt: null
    },
    include: {
      achievement: true
    },
    orderBy: {
      progress: 'desc'
    }
  });

  return { unlocked, inProgress };
}

/**
 * Obtener progreso de un logro específico
 */
export async function getAchievementProgress(
  userId: string,
  guildId: string,
  achievementKey: string
) {
  const achievement = await prisma.achievement.findUnique({
    where: { guildId_key: { guildId, key: achievementKey } }
  });

  if (!achievement) return null;

  const progress = await prisma.playerAchievement.findUnique({
    where: {
      userId_guildId_achievementId: {
        userId,
        guildId,
        achievementId: achievement.id
      }
    }
  });

  if (!progress) return { current: 0, required: (achievement.requirements as any).value, percentage: 0 };

  const required = (achievement.requirements as any).value;
  const percentage = Math.min(100, Math.floor((progress.progress / required) * 100));

  return {
    current: progress.progress,
    required,
    percentage,
    unlocked: !!progress.unlockedAt
  };
}

/**
 * Crear barra de progreso visual
 */
export function createProgressBar(current: number, total: number, width: number = 10): string {
  const filled = Math.floor((current / total) * width);
  const empty = Math.max(0, width - filled);
  const percentage = Math.min(100, Math.floor((current / total) * 100));
  return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${percentage}%`;
}

/**
 * Obtener estadísticas de logros del jugador
 */
export async function getAchievementStats(userId: string, guildId: string) {
  const total = await prisma.achievement.count({
    where: { OR: [{ guildId }, { guildId: null }] }
  });

  const unlocked = await prisma.playerAchievement.count({
    where: {
      userId,
      guildId,
      unlockedAt: { not: null }
    }
  });

  const totalPoints = await prisma.playerAchievement.findMany({
    where: {
      userId,
      guildId,
      unlockedAt: { not: null }
    },
    include: {
      achievement: true
    }
  }).then(achievements => 
    achievements.reduce((sum, pa) => sum + (pa.achievement.points || 0), 0)
  );

  return {
    total,
    unlocked,
    locked: total - unlocked,
    percentage: total > 0 ? Math.floor((unlocked / total) * 100) : 0,
    points: totalPoints
  };
}
