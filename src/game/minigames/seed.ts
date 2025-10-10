import { prisma } from "../../core/database/prisma";
import { Prisma } from "@prisma/client";

async function upsertEconomyItem(
  guildId: string | null,
  key: string,
  data: Omit<Prisma.EconomyItemUncheckedCreateInput, "key" | "guildId">
) {
  if (guildId) {
    return prisma.economyItem.upsert({
      where: { guildId_key: { guildId, key } },
      update: {},
      create: { ...data, key, guildId },
    });
  }
  const existing = await prisma.economyItem.findFirst({
    where: { key, guildId: null },
  });
  if (existing)
    return prisma.economyItem.update({ where: { id: existing.id }, data: {} });
  return prisma.economyItem.create({ data: { ...data, key, guildId: null } });
}

async function upsertGameArea(
  guildId: string | null,
  key: string,
  data: Omit<Prisma.GameAreaUncheckedCreateInput, "key" | "guildId">
) {
  if (guildId) {
    return prisma.gameArea.upsert({
      where: { guildId_key: { guildId, key } },
      update: {},
      create: { ...data, key, guildId },
    });
  }
  const existing = await prisma.gameArea.findFirst({
    where: { key, guildId: null },
  });
  if (existing)
    return prisma.gameArea.update({ where: { id: existing.id }, data: {} });
  return prisma.gameArea.create({ data: { ...data, key, guildId: null } });
}

async function upsertMob(
  guildId: string | null,
  key: string,
  data: Omit<Prisma.MobUncheckedCreateInput, "key" | "guildId">
) {
  if (guildId) {
    return prisma.mob.upsert({
      where: { guildId_key: { guildId, key } },
      update: {
        stats: (data as any).stats,
        drops: (data as any).drops,
        name: (data as any).name,
      },
      create: { ...data, key, guildId },
    });
  }
  const existing = await prisma.mob.findFirst({
    where: { key, guildId: null },
  });
  if (existing)
    return prisma.mob.update({
      where: { id: existing.id },
      data: {
        stats: (data as any).stats,
        drops: (data as any).drops,
        name: (data as any).name,
      },
    });
  return prisma.mob.create({ data: { ...data, key, guildId: null } });
}

async function main() {
  const guildId = "1316592320954630144"; // null => global

  // Items base: herramientas y minerales
  const pickKey = "tool.pickaxe.basic";
  const rodKey = "tool.rod.basic";
  const swordKey = "weapon.sword.iron";
  const armorKey = "armor.leather.basic";
  const capeKey = "cape.life.minor";

  const ironKey = "ore.iron";
  const goldKey = "ore.gold";
  const ironIngotKey = "ingot.iron";

  const fishCommonKey = "fish.common";
  const fishRareKey = "fish.rare";

  // Herramientas
  await upsertEconomyItem(guildId, pickKey, {
    name: "Pico Básico",
    stackable: false,
    props: {
      tool: { type: "pickaxe", tier: 1 },
      breakable: { enabled: true, maxDurability: 100, durabilityPerUse: 5 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["tool", "mine"],
  });

  await upsertEconomyItem(guildId, rodKey, {
    name: "Caña Básica",
    stackable: false,
    props: {
      tool: { type: "rod", tier: 1 },
      breakable: { enabled: true, maxDurability: 80, durabilityPerUse: 3 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["tool", "fish"],
  });

  // Arma, armadura y capa
  await upsertEconomyItem(guildId, swordKey, {
    name: "Espada de Hierro",
    stackable: false,
    props: {
      damage: 10,
      tool: { type: "sword", tier: 1 },
      breakable: { enabled: true, maxDurability: 150, durabilityPerUse: 2 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["weapon"],
  });

  await upsertEconomyItem(guildId, armorKey, {
    name: "Armadura de Cuero",
    stackable: false,
    props: { defense: 3 } as unknown as Prisma.InputJsonValue,
    tags: ["armor"],
  });

  await upsertEconomyItem(guildId, capeKey, {
    name: "Capa de Vida Menor",
    stackable: false,
    props: { maxHpBonus: 20 } as unknown as Prisma.InputJsonValue,
    tags: ["cape"],
  });

  // Materiales
  await upsertEconomyItem(guildId, ironKey, {
    name: "Mineral de Hierro",
    stackable: true,
    props: { craftingOnly: true } as unknown as Prisma.InputJsonValue,
    tags: ["ore", "common"],
  });

  await upsertEconomyItem(guildId, goldKey, {
    name: "Mineral de Oro",
    stackable: true,
    props: { craftingOnly: true } as unknown as Prisma.InputJsonValue,
    tags: ["ore", "rare"],
  });

  await upsertEconomyItem(guildId, ironIngotKey, {
    name: "Lingote de Hierro",
    stackable: true,
    props: {} as unknown as Prisma.InputJsonValue,
    tags: ["ingot", "metal"],
  });

  // Comida (pesca) que cura con cooldown
  await upsertEconomyItem(guildId, fishCommonKey, {
    name: "Pez Común",
    stackable: true,
    props: {
      food: { healHp: 10, cooldownSeconds: 30 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["fish", "food", "common"],
  });

  await upsertEconomyItem(guildId, fishRareKey, {
    name: "Pez Raro",
    stackable: true,
    props: {
      food: { healHp: 20, healPercent: 5, cooldownSeconds: 45 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["fish", "food", "rare"],
  });

  // Área de mina con niveles
  const mineArea = await upsertGameArea(guildId, "mine.cavern", {
    name: "Mina: Caverna",
    type: "MINE",
    config: { cooldownSeconds: 10 } as unknown as Prisma.InputJsonValue,
  });

  await prisma.gameAreaLevel.upsert({
    where: { areaId_level: { areaId: mineArea.id, level: 1 } },
    update: {},
    create: {
      areaId: mineArea.id,
      level: 1,
      requirements: {
        tool: { required: true, toolType: "pickaxe", minTier: 1 },
      } as unknown as Prisma.InputJsonValue,
      rewards: {
        draws: 2,
        table: [
          { type: "item", itemKey: ironKey, qty: 2, weight: 70 },
          { type: "item", itemKey: ironKey, qty: 3, weight: 20 },
          { type: "item", itemKey: goldKey, qty: 1, weight: 10 },
        ],
      } as unknown as Prisma.InputJsonValue,
      mobs: {
        draws: 1,
        table: [
          { mobKey: "bat", weight: 20 },
          { mobKey: "slime", weight: 10 },
        ],
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.gameAreaLevel.upsert({
    where: { areaId_level: { areaId: mineArea.id, level: 2 } },
    update: {},
    create: {
      areaId: mineArea.id,
      level: 2,
      requirements: {
        tool: { required: true, toolType: "pickaxe", minTier: 2 },
      } as unknown as Prisma.InputJsonValue,
      rewards: {
        draws: 3,
        table: [
          { type: "item", itemKey: ironKey, qty: 3, weight: 60 },
          { type: "item", itemKey: goldKey, qty: 1, weight: 30 },
          { type: "coins", amount: 50, weight: 10 },
        ],
      } as unknown as Prisma.InputJsonValue,
      mobs: {
        draws: 2,
        table: [
          { mobKey: "bat", weight: 20 },
          { mobKey: "slime", weight: 20 },
          { mobKey: "goblin", weight: 10 },
        ],
      } as unknown as Prisma.InputJsonValue,
    },
  });

  // Área de laguna (pesca)
  const lagoon = await upsertGameArea(guildId, "lagoon.shore", {
    name: "Laguna: Orilla",
    type: "LAGOON",
    config: { cooldownSeconds: 12 } as unknown as Prisma.InputJsonValue,
  });

  await prisma.gameAreaLevel.upsert({
    where: { areaId_level: { areaId: lagoon.id, level: 1 } },
    update: {},
    create: {
      areaId: lagoon.id,
      level: 1,
      requirements: {
        tool: { required: true, toolType: "rod", minTier: 1 },
      } as unknown as Prisma.InputJsonValue,
      rewards: {
        draws: 2,
        table: [
          { type: "item", itemKey: fishCommonKey, qty: 1, weight: 70 },
          { type: "item", itemKey: fishRareKey, qty: 1, weight: 10 },
          { type: "coins", amount: 10, weight: 20 },
        ],
      } as unknown as Prisma.InputJsonValue,
      mobs: { draws: 0, table: [] } as unknown as Prisma.InputJsonValue,
    },
  });

  // Área de pelea (arena)
  const arena = await upsertGameArea(guildId, "fight.arena", {
    name: "Arena de Combate",
    type: "FIGHT",
    config: { cooldownSeconds: 15 } as unknown as Prisma.InputJsonValue,
  });

  await prisma.gameAreaLevel.upsert({
    where: { areaId_level: { areaId: arena.id, level: 1 } },
    update: {},
    create: {
      areaId: arena.id,
      level: 1,
      requirements: {
        tool: {
          required: true,
          toolType: "sword",
          minTier: 1,
          allowedKeys: [swordKey],
        },
      } as unknown as Prisma.InputJsonValue,
      rewards: {
        draws: 1,
        table: [{ type: "coins", amount: 25, weight: 100 }],
      } as unknown as Prisma.InputJsonValue,
      mobs: {
        draws: 1,
        table: [
          { mobKey: "slime", weight: 50 },
          { mobKey: "goblin", weight: 50 },
        ],
      } as unknown as Prisma.InputJsonValue,
    },
  });

  // Mobs básicos
  const mobs = [
    { key: "bat", name: "Murciélago", stats: { attack: 4 } },
    { key: "slime", name: "Slime", stats: { attack: 6 } },
    { key: "goblin", name: "Duende", stats: { attack: 8 } },
  ];
  for (const m of mobs) {
    await upsertMob(guildId, m.key, {
      name: m.name,
      stats: m.stats as unknown as Prisma.InputJsonValue,
      drops: Prisma.DbNull,
    });
  }

  // Programar un par de ataques de mobs (demostración)
  const targetUser = "327207082203938818";
  if (targetUser) {
    const slime = await prisma.mob.findFirst({
      where: { key: "slime", OR: [{ guildId }, { guildId: null }] },
      orderBy: [{ guildId: "desc" }],
    });
    if (slime) {
      const now = Date.now();
      await prisma.scheduledMobAttack.createMany({
        data: [
          {
            userId: targetUser,
            guildId: guildId ?? "global",
            mobId: slime.id,
            scheduleAt: new Date(now + 5_000),
          },
          {
            userId: targetUser,
            guildId: guildId ?? "global",
            mobId: slime.id,
            scheduleAt: new Date(now + 15_000),
          },
        ],
      });
    }
  }

  // ---------------------------------------------------------------------------
  // NUEVO CONTENIDO PARA PROBAR SISTEMAS AVANZADOS (tiers, riskFactor, fatiga)
  // ---------------------------------------------------------------------------

  // Herramientas / equipo Tier 2
  const pickKeyT2 = "tool.pickaxe.iron";
  const rodKeyT2 = "tool.rod.oak";
  const swordKeyT2 = "weapon.sword.steel";
  const armorKeyT2 = "armor.chain.basic";
  const capeKeyT2 = "cape.life.moderate";

  await upsertEconomyItem(guildId, pickKeyT2, {
    name: "Pico de Hierro",
    stackable: false,
    props: {
      tool: { type: "pickaxe", tier: 2 },
      breakable: { enabled: true, maxDurability: 180, durabilityPerUse: 4 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["tool", "mine", "tier2"],
  });

  await upsertEconomyItem(guildId, rodKeyT2, {
    name: "Caña Robusta",
    stackable: false,
    props: {
      tool: { type: "rod", tier: 2 },
      breakable: { enabled: true, maxDurability: 140, durabilityPerUse: 3 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["tool", "fish", "tier2"],
  });

  await upsertEconomyItem(guildId, swordKeyT2, {
    name: "Espada de Acero",
    stackable: false,
    props: {
      damage: 18,
      tool: { type: "sword", tier: 2 },
      breakable: { enabled: true, maxDurability: 220, durabilityPerUse: 2 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["weapon", "tier2"],
  });

  await upsertEconomyItem(guildId, armorKeyT2, {
    name: "Armadura de Cota de Malla",
    stackable: false,
    props: { defense: 6 } as unknown as Prisma.InputJsonValue,
    tags: ["armor", "tier2"],
  });

  await upsertEconomyItem(guildId, capeKeyT2, {
    name: "Capa de Vida Moderada",
    stackable: false,
    props: { maxHpBonus: 40 } as unknown as Prisma.InputJsonValue,
    tags: ["cape", "tier2"],
  });

  // Consumibles / pruebas de curación y limpieza de efectos
  const bigFoodKey = "food.meat.large";
  const fatigueClearPotionKey = "potion.fatigue.clear";

  await upsertEconomyItem(guildId, bigFoodKey, {
    name: "Carne Asada Grande",
    stackable: true,
    props: {
      food: { healHp: 40, healPercent: 10, cooldownSeconds: 60 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["food", "healing"],
  });

  await upsertEconomyItem(guildId, fatigueClearPotionKey, {
    name: "Poción Energética",
    stackable: true,
    props: {
      potion: { removeEffects: ["FATIGUE"], cooldownSeconds: 90 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["potion", "utility"],
  });

  // ÁREA NUEVA: Mina de Fisura (más riesgo => probar penalización muerte)
  const riftMine = await upsertGameArea(guildId, "mine.rift", {
    name: "Mina: Fisura Cristalina",
    type: "MINE",
    config: { cooldownSeconds: 14 } as unknown as Prisma.InputJsonValue,
    metadata: { riskFactor: 1.6 } as unknown as Prisma.InputJsonValue,
  });

  await prisma.gameAreaLevel.upsert({
    where: { areaId_level: { areaId: riftMine.id, level: 1 } },
    update: {},
    create: {
      areaId: riftMine.id,
      level: 1,
      requirements: {
        tool: { required: true, toolType: "pickaxe", minTier: 2 },
      } as unknown as Prisma.InputJsonValue,
      rewards: {
        draws: 3,
        table: [
          { type: "item", itemKey: ironKey, qty: 4, weight: 55 },
          { type: "item", itemKey: goldKey, qty: 2, weight: 20 },
          { type: "coins", amount: 60, weight: 25 },
        ],
      } as unknown as Prisma.InputJsonValue,
      mobs: {
        draws: 2,
        table: [
          { mobKey: "goblin", weight: 25 },
          { mobKey: "orc", weight: 15 },
        ],
      } as unknown as Prisma.InputJsonValue,
      metadata: { suggestedHp: 120 } as unknown as Prisma.InputJsonValue,
    },
  });

  // Extensión de la mina existente: nivel 3
  await prisma.gameAreaLevel.upsert({
    where: { areaId_level: { areaId: mineArea.id, level: 3 } },
    update: {},
    create: {
      areaId: mineArea.id,
      level: 3,
      requirements: {
        tool: { required: true, toolType: "pickaxe", minTier: 2 },
      } as unknown as Prisma.InputJsonValue,
      rewards: {
        draws: 4,
        table: [
          { type: "item", itemKey: ironKey, qty: 4, weight: 50 },
          { type: "item", itemKey: goldKey, qty: 2, weight: 25 },
          { type: "coins", amount: 80, weight: 15 },
          { type: "coins", amount: 120, weight: 10 },
        ],
      } as unknown as Prisma.InputJsonValue,
      mobs: {
        draws: 2,
        table: [
          { mobKey: "slime", weight: 20 },
          { mobKey: "goblin", weight: 20 },
          { mobKey: "orc", weight: 10 },
        ],
      } as unknown as Prisma.InputJsonValue,
    },
  });

  // Laguna nivel 2
  await prisma.gameAreaLevel.upsert({
    where: { areaId_level: { areaId: lagoon.id, level: 2 } },
    update: {},
    create: {
      areaId: lagoon.id,
      level: 2,
      requirements: {
        tool: { required: true, toolType: "rod", minTier: 2 },
      } as unknown as Prisma.InputJsonValue,
      rewards: {
        draws: 3,
        table: [
          { type: "item", itemKey: fishCommonKey, qty: 2, weight: 60 },
          { type: "item", itemKey: fishRareKey, qty: 1, weight: 20 },
          { type: "coins", amount: 30, weight: 20 },
        ],
      } as unknown as Prisma.InputJsonValue,
      mobs: { draws: 0, table: [] } as unknown as Prisma.InputJsonValue,
    },
  });

  // Arena existente: nivel 2
  await prisma.gameAreaLevel.upsert({
    where: { areaId_level: { areaId: arena.id, level: 2 } },
    update: {},
    create: {
      areaId: arena.id,
      level: 2,
      requirements: {
        tool: { required: true, toolType: "sword", minTier: 2 },
      } as unknown as Prisma.InputJsonValue,
      rewards: {
        draws: 1,
        table: [
          { type: "coins", amount: 60, weight: 70 },
          { type: "coins", amount: 90, weight: 30 },
        ],
      } as unknown as Prisma.InputJsonValue,
      mobs: {
        draws: 1,
        table: [
          { mobKey: "goblin", weight: 40 },
          { mobKey: "orc", weight: 40 },
          { mobKey: "troll", weight: 20 },
        ],
      } as unknown as Prisma.InputJsonValue,
    },
  });

  // Arena élite separada para probar riskFactor de muerte
  const eliteArena = await upsertGameArea(guildId, "fight.arena.elite", {
    name: "Arena de Combate Élite",
    type: "FIGHT",
    config: { cooldownSeconds: 25 } as unknown as Prisma.InputJsonValue,
    metadata: { riskFactor: 1.4 } as unknown as Prisma.InputJsonValue,
  });

  await prisma.gameAreaLevel.upsert({
    where: { areaId_level: { areaId: eliteArena.id, level: 1 } },
    update: {},
    create: {
      areaId: eliteArena.id,
      level: 1,
      requirements: {
        tool: { required: true, toolType: "sword", minTier: 2 },
      } as unknown as Prisma.InputJsonValue,
      rewards: {
        draws: 1,
        table: [
          { type: "coins", amount: 120, weight: 70 },
          { type: "coins", amount: 180, weight: 30 },
        ],
      } as unknown as Prisma.InputJsonValue,
      mobs: {
        draws: 1,
        table: [
          { mobKey: "orc", weight: 40 },
          { mobKey: "troll", weight: 35 },
          { mobKey: "dragonling", weight: 25 },
        ],
      } as unknown as Prisma.InputJsonValue,
      metadata: { suggestedHp: 150 } as unknown as Prisma.InputJsonValue,
    },
  });

  // Nuevos mobs avanzados
  const extraMobs = [
    { key: "orc", name: "Orco", stats: { attack: 12, defense: 2 } },
    { key: "troll", name: "Trol", stats: { attack: 20, defense: 4 } },
    {
      key: "dragonling",
      name: "Dragoncito",
      stats: { attack: 35, defense: 6 },
    },
  ];
  for (const m of extraMobs) {
    await upsertMob(guildId, m.key, {
      name: m.name,
      stats: m.stats as unknown as Prisma.InputJsonValue,
      drops: Prisma.DbNull,
    });
  }

  // Programar ataques extra de mobs nuevos para pruebas (si existe user objetivo)
  if (targetUser) {
    const orc = await prisma.mob.findFirst({
      where: { key: "orc", OR: [{ guildId }, { guildId: null }] },
      orderBy: [{ guildId: "desc" }],
    });
    const dragon = await prisma.mob.findFirst({
      where: { key: "dragonling", OR: [{ guildId }, { guildId: null }] },
      orderBy: [{ guildId: "desc" }],
    });
    const now = Date.now();
    const extraAttacks: Prisma.ScheduledMobAttackCreateManyInput[] = [];
    if (orc) {
      extraAttacks.push({
        userId: targetUser,
        guildId: guildId ?? "global",
        mobId: orc.id,
        scheduleAt: new Date(now + 25_000),
      });
    }
    if (dragon) {
      extraAttacks.push({
        userId: targetUser,
        guildId: guildId ?? "global",
        mobId: dragon.id,
        scheduleAt: new Date(now + 40_000),
      });
    }
    if (extraAttacks.length) {
      await prisma.scheduledMobAttack.createMany({ data: extraAttacks });
    }
  }

  // Insertar un efecto FATIGUE de prueba (15% por 30 min) para validar penalización de monedas y reducción de stats
  if (targetUser) {
    const expires = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.playerStatusEffect.upsert({
      where: {
        userId_guildId_type: {
          userId: targetUser,
          guildId: guildId ?? "global",
          type: "FATIGUE",
        },
      },
      update: { magnitude: 0.15, expiresAt: expires },
      create: {
        userId: targetUser,
        guildId: guildId ?? "global",
        type: "FATIGUE",
        magnitude: 0.15,
        expiresAt: expires,
      },
    });
  }

  // Asegurar PlayerState base para el usuario de prueba
  if (targetUser) {
    await prisma.playerState.upsert({
      where: {
        userId_guildId: { userId: targetUser, guildId: guildId ?? "global" },
      },
      update: {},
      create: {
        userId: targetUser,
        guildId: guildId ?? "global",
        hp: 100,
        maxHp: 100,
      },
    });
  }

  console.log("[seed:minigames] done");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
