import { prisma } from '../../core/database/prisma';
import { giveRewards, type Reward } from '../rewards/service';
import logger from '../../core/lib/logger';

/**
 * Actualizar progreso de misiones del jugador
 */
export async function updateQuestProgress(
  userId: string,
  guildId: string,
  questType: string,
  increment: number = 1
) {
  try {
    // Obtener misiones activas que coincidan con el tipo
    const quests = await prisma.quest.findMany({
      where: {
        OR: [{ guildId }, { guildId: null }],
        active: true,
        OR: [
          { endAt: null },
          { endAt: { gte: new Date() } }
        ]
      }
    });

    const updates = [];

    for (const quest of quests) {
      const req = quest.requirements as any;
      
      // Verificar si el tipo de misión coincide
      if (req.type !== questType) continue;

      // Obtener o crear progreso
      let progress = await prisma.questProgress.findFirst({
        where: {
          userId,
          guildId,
          questId: quest.id,
          claimed: false
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!progress) {
        // Crear nuevo progreso
        progress = await prisma.questProgress.create({
          data: {
            userId,
            guildId,
            questId: quest.id,
            progress: 0,
            expiresAt: quest.endAt
          }
        });
      }

      // Ya completada y reclamada
      if (progress.completed && progress.claimed) {
        // Si es repetible, crear nuevo progreso
        if (quest.repeatable) {
          progress = await prisma.questProgress.create({
            data: {
              userId,
              guildId,
              questId: quest.id,
              progress: 0,
              expiresAt: quest.endAt
            }
          });
        } else {
          continue;
        }
      }

      // Actualizar progreso
      const newProgress = progress.progress + increment;
      const isCompleted = newProgress >= req.count;

      await prisma.questProgress.update({
        where: { id: progress.id },
        data: {
          progress: newProgress,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null
        }
      });

      if (isCompleted) {
        updates.push(quest);
      }
    }

    return updates;
  } catch (error) {
    logger.error(`Error updating quest progress for ${userId}:`, error);
    return [];
  }
}

/**
 * Reclamar recompensa de misión completada
 */
export async function claimQuestReward(
  userId: string,
  guildId: string,
  questId: string
) {
  try {
    const progress = await prisma.questProgress.findFirst({
      where: {
        userId,
        guildId,
        questId,
        completed: true,
        claimed: false
      },
      include: {
        quest: true
      }
    });

    if (!progress) {
      throw new Error('Misión no encontrada o ya reclamada');
    }

    // Dar recompensas
    const rewards = await giveRewards(
      userId,
      guildId,
      progress.quest.rewards as Reward,
      `quest:${progress.quest.key}`
    );

    // Marcar como reclamada
    await prisma.questProgress.update({
      where: { id: progress.id },
      data: {
        claimed: true,
        claimedAt: new Date()
      }
    });

    return { quest: progress.quest, rewards };
  } catch (error) {
    logger.error(`Error claiming quest reward for ${userId}:`, error);
    throw error;
  }
}

/**
 * Obtener misiones disponibles y progreso del jugador
 */
export async function getPlayerQuests(userId: string, guildId: string) {
  const quests = await prisma.quest.findMany({
    where: {
      OR: [{ guildId }, { guildId: null }],
      active: true,
      OR: [
        { endAt: null },
        { endAt: { gte: new Date() } }
      ]
    },
    orderBy: [
      { type: 'asc' },
      { category: 'asc' }
    ]
  });

  const questsWithProgress = await Promise.all(
    quests.map(async (quest) => {
      const progress = await prisma.questProgress.findFirst({
        where: {
          userId,
          guildId,
          questId: quest.id
        },
        orderBy: { createdAt: 'desc' }
      });

      return {
        quest,
        progress: progress || null,
        canClaim: progress?.completed && !progress?.claimed,
        percentage: progress 
          ? Math.min(100, Math.floor((progress.progress / (quest.requirements as any).count) * 100))
          : 0
      };
    })
  );

  // Agrupar por tipo
  return {
    daily: questsWithProgress.filter(q => q.quest.type === 'daily'),
    weekly: questsWithProgress.filter(q => q.quest.type === 'weekly'),
    permanent: questsWithProgress.filter(q => q.quest.type === 'permanent'),
    event: questsWithProgress.filter(q => q.quest.type === 'event')
  };
}

/**
 * Generar misiones diarias aleatorias
 */
export async function generateDailyQuests(guildId: string) {
  try {
    // Eliminar misiones diarias antiguas
    await prisma.quest.deleteMany({
      where: {
        guildId,
        type: 'daily',
        endAt: { lt: new Date() }
      }
    });

    // Templates de misiones diarias
    const dailyTemplates = [
      {
        key: 'daily_mine',
        name: 'Minero Diario',
        description: 'Mina 10 veces',
        category: 'mining',
        requirements: { type: 'mine_count', count: 10 },
        rewards: { coins: 500 }
      },
      {
        key: 'daily_fish',
        name: 'Pescador Diario',
        description: 'Pesca 8 veces',
        category: 'fishing',
        requirements: { type: 'fish_count', count: 8 },
        rewards: { coins: 400 }
      },
      {
        key: 'daily_fight',
        name: 'Guerrero Diario',
        description: 'Pelea 5 veces',
        category: 'combat',
        requirements: { type: 'fight_count', count: 5 },
        rewards: { coins: 600 }
      },
      {
        key: 'daily_craft',
        name: 'Artesano Diario',
        description: 'Craftea 3 items',
        category: 'crafting',
        requirements: { type: 'craft_count', count: 3 },
        rewards: { coins: 300 }
      }
    ];

    // Crear 3 misiones diarias aleatorias
    const selectedTemplates = dailyTemplates
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const startAt = new Date();
    const endAt = new Date();
    endAt.setHours(23, 59, 59, 999);

    for (const template of selectedTemplates) {
      await prisma.quest.create({
        data: {
          ...template,
          guildId,
          type: 'daily',
          startAt,
          endAt,
          active: true,
          repeatable: false
        }
      });
    }

    logger.info(`Generated ${selectedTemplates.length} daily quests for guild ${guildId}`);
    return selectedTemplates.length;
  } catch (error) {
    logger.error(`Error generating daily quests for ${guildId}:`, error);
    return 0;
  }
}

/**
 * Limpiar misiones expiradas
 */
export async function cleanExpiredQuests(guildId: string) {
  const result = await prisma.quest.updateMany({
    where: {
      guildId,
      active: true,
      endAt: { lt: new Date() }
    },
    data: {
      active: false
    }
  });

  logger.info(`Deactivated ${result.count} expired quests for guild ${guildId}`);
  return result.count;
}
