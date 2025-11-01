import { prisma } from '../../core/database/prisma';
import logger from '../../core/lib/logger';

/**
 * Seed de logros base
 */
export async function seedAchievements(guildId: string | null = null) {
  const achievements = [
    // Minería
    {
      key: 'first_mine',
      name: '⛏️ Primera Mina',
      description: 'Mina por primera vez',
      category: 'mining',
      requirements: { type: 'mine_count', value: 1 },
      rewards: { coins: 100 },
      hidden: false,
      points: 10
    },
    {
      key: 'miner_novice',
      name: '⛏️ Minero Novato',
      description: 'Mina 10 veces',
      category: 'mining',
      requirements: { type: 'mine_count', value: 10 },
      rewards: { coins: 500 },
      hidden: false,
      points: 20
    },
    {
      key: 'miner_expert',
      name: '⛏️ Minero Experto',
      description: 'Mina 50 veces',
      category: 'mining',
      requirements: { type: 'mine_count', value: 50 },
      rewards: { coins: 2500 },
      hidden: false,
      points: 50
    },
    {
      key: 'miner_master',
      name: '⛏️ Maestro Minero',
      description: 'Mina 100 veces',
      category: 'mining',
      requirements: { type: 'mine_count', value: 100 },
      rewards: { coins: 10000 },
      hidden: false,
      points: 100
    },

    // Pesca
    {
      key: 'first_fish',
      name: '🎣 Primera Pesca',
      description: 'Pesca por primera vez',
      category: 'fishing',
      requirements: { type: 'fish_count', value: 1 },
      rewards: { coins: 100 },
      hidden: false,
      points: 10
    },
    {
      key: 'fisher_novice',
      name: '🎣 Pescador Novato',
      description: 'Pesca 10 veces',
      category: 'fishing',
      requirements: { type: 'fish_count', value: 10 },
      rewards: { coins: 500 },
      hidden: false,
      points: 20
    },
    {
      key: 'fisher_expert',
      name: '🎣 Pescador Experto',
      description: 'Pesca 50 veces',
      category: 'fishing',
      requirements: { type: 'fish_count', value: 50 },
      rewards: { coins: 2500 },
      hidden: false,
      points: 50
    },

    // Combate
    {
      key: 'first_fight',
      name: '⚔️ Primera Pelea',
      description: 'Pelea por primera vez',
      category: 'combat',
      requirements: { type: 'fight_count', value: 1 },
      rewards: { coins: 150 },
      hidden: false,
      points: 10
    },
    {
      key: 'warrior_novice',
      name: '⚔️ Guerrero Novato',
      description: 'Pelea 10 veces',
      category: 'combat',
      requirements: { type: 'fight_count', value: 10 },
      rewards: { coins: 750 },
      hidden: false,
      points: 20
    },
    {
      key: 'mob_hunter',
      name: '👾 Cazador de Monstruos',
      description: 'Derrota 50 mobs',
      category: 'combat',
      requirements: { type: 'mob_defeat_count', value: 50 },
      rewards: { coins: 3000 },
      hidden: false,
      points: 50
    },
    {
      key: 'mob_slayer',
      name: '👾 Asesino de Monstruos',
      description: 'Derrota 200 mobs',
      category: 'combat',
      requirements: { type: 'mob_defeat_count', value: 200 },
      rewards: { coins: 15000 },
      hidden: false,
      points: 100
    },

    // Economía
    {
      key: 'first_coins',
      name: '💰 Primeras Monedas',
      description: 'Gana 1,000 monedas en total',
      category: 'economy',
      requirements: { type: 'coins_earned', value: 1000 },
      rewards: { coins: 200 },
      hidden: false,
      points: 10
    },
    {
      key: 'wealthy',
      name: '💰 Acaudalado',
      description: 'Gana 10,000 monedas en total',
      category: 'economy',
      requirements: { type: 'coins_earned', value: 10000 },
      rewards: { coins: 2000 },
      hidden: false,
      points: 30
    },
    {
      key: 'millionaire',
      name: '💰 Millonario',
      description: 'Gana 100,000 monedas en total',
      category: 'economy',
      requirements: { type: 'coins_earned', value: 100000 },
      rewards: { coins: 25000 },
      hidden: false,
      points: 100
    },

    // Crafteo
    {
      key: 'first_craft',
      name: '🛠️ Primer Crafteo',
      description: 'Craftea tu primer item',
      category: 'crafting',
      requirements: { type: 'craft_count', value: 1 },
      rewards: { coins: 100 },
      hidden: false,
      points: 10
    },
    {
      key: 'crafter_expert',
      name: '🛠️ Artesano Experto',
      description: 'Craftea 50 items',
      category: 'crafting',
      requirements: { type: 'craft_count', value: 50 },
      rewards: { coins: 5000 },
      hidden: false,
      points: 50
    },
    {
      key: 'master_crafter',
      name: '🛠️ Maestro Artesano',
      description: 'Craftea 200 items',
      category: 'crafting',
      requirements: { type: 'craft_count', value: 200 },
      rewards: { coins: 20000 },
      hidden: false,
      points: 100
    }
  ];

  let created = 0;
  for (const ach of achievements) {
    const existing = await prisma.achievement.findUnique({
      where: { guildId_key: { guildId: guildId || '', key: ach.key } }
    });

    if (!existing) {
      await prisma.achievement.create({
        data: { ...ach, guildId: guildId || undefined }
      });
      created++;
    }
  }

  console.log(`Seeded ${created} achievements for guild ${guildId || 'global'}`);
  return created;
}

/**
 * Ejecutar si es llamado directamente
 */
if (require.main === module) {
  seedAchievements(null)
    .then(count => {
      console.log(`✅ ${count} achievements seeded`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error seeding achievements:', error);
      process.exit(1);
    });
}
