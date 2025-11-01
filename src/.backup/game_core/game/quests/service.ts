import { prisma } from '../../core/database/prisma';
import { giveRewards, type Reward } from '../rewards/service';
import logger from '../../core/lib/logger';
import { ensureUserAndGuildExist } from '../core/userService';

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
    // Asegurar que User y Guild existan antes de crear/buscar quest progress
    await ensureUserAndGuildExist(userId, guildId);
    
    // Obtener misiones activas que coincidan con el tipo
    const quests = await prisma.quest.findMany({
      where: {
        OR: [{ guildId }, { guildId: null }],
        active: true
      }
    });

    const updates: any[] = [];

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
    console.error(`Error updating quest progress for ${userId}:`, error);
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
    console.error(`Error claiming quest reward for ${userId}:`, error);
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
      active: true
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

    // Templates de misiones diarias expandidas
    const dailyTemplates = [
      // Minería
      {
        key: 'daily_mine',
        name: 'Minero Diario',
        description: 'Mina 10 veces',
        category: 'mining',
        requirements: { type: 'mine_count', count: 10 },
        rewards: { coins: 500 }
      },
      {
        key: 'daily_mine_hard',
        name: 'Minero Dedicado',
        description: 'Mina 20 veces',
        category: 'mining',
        requirements: { type: 'mine_count', count: 20 },
        rewards: { coins: 1200 }
      },
      // Pesca
      {
        key: 'daily_fish',
        name: 'Pescador Diario',
        description: 'Pesca 8 veces',
        category: 'fishing',
        requirements: { type: 'fish_count', count: 8 },
        rewards: { coins: 400 }
      },
      {
        key: 'daily_fish_hard',
        name: 'Pescador Experto',
        description: 'Pesca 15 veces',
        category: 'fishing',
        requirements: { type: 'fish_count', count: 15 },
        rewards: { coins: 900 }
      },
      // Combate
      {
        key: 'daily_fight',
        name: 'Guerrero Diario',
        description: 'Pelea 5 veces',
        category: 'combat',
        requirements: { type: 'fight_count', count: 5 },
        rewards: { coins: 600 }
      },
      {
        key: 'daily_mob_slayer',
        name: 'Cazador de Monstruos',
        description: 'Derrota 10 mobs',
        category: 'combat',
        requirements: { type: 'mob_defeat_count', count: 10 },
        rewards: { coins: 800 }
      },
      // Crafteo
      {
        key: 'daily_craft',
        name: 'Artesano Diario',
        description: 'Craftea 3 items',
        category: 'crafting',
        requirements: { type: 'craft_count', count: 3 },
        rewards: { coins: 300 }
      },
      {
        key: 'daily_craft_hard',
        name: 'Maestro Artesano',
        description: 'Craftea 10 items',
        category: 'crafting',
        requirements: { type: 'craft_count', count: 10 },
        rewards: { coins: 1000 }
      },
      // Economía
      {
        key: 'daily_coins',
        name: 'Acumulador',
        description: 'Gana 5000 monedas',
        category: 'economy',
        requirements: { type: 'coins_earned', count: 5000 },
        rewards: { coins: 1000 }
      },
      {
        key: 'daily_purchase',
        name: 'Comprador',
        description: 'Compra 3 items en la tienda',
        category: 'economy',
        requirements: { type: 'items_purchased', count: 3 },
        rewards: { coins: 500 }
      },
      // Items
      {
        key: 'daily_consume',
        name: 'Consumidor',
        description: 'Consume 5 items',
        category: 'items',
        requirements: { type: 'items_consumed', count: 5 },
        rewards: { coins: 300 }
      },
      {
        key: 'daily_equip',
        name: 'Equipador',
        description: 'Equipa 3 items diferentes',
        category: 'items',
        requirements: { type: 'items_equipped', count: 3 },
        rewards: { coins: 400 }
      },
      // Fundición
      {
        key: 'daily_smelt',
        name: 'Fundidor',
        description: 'Funde 5 items',
        category: 'smelting',
        requirements: { type: 'items_smelted', count: 5 },
        rewards: { coins: 700 }
      },
      // Combinadas
      {
        key: 'daily_variety',
        name: 'Multitarea',
        description: 'Mina, pesca y pelea 3 veces cada uno',
        category: 'variety',
        requirements: { 
          type: 'variety',
          conditions: [
            { type: 'mine_count', count: 3 },
            { type: 'fish_count', count: 3 },
            { type: 'fight_count', count: 3 }
          ]
        },
        rewards: { coins: 1500 }
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

    console.log(`Generated ${selectedTemplates.length} daily quests for guild ${guildId}`);
    return selectedTemplates.length;
  } catch (error) {
    console.error(`Error generating daily quests for ${guildId}:`, error);
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

  console.log(`Deactivated ${result.count} expired quests for guild ${guildId}`);
  return result.count;
}
