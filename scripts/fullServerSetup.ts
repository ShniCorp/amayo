import { prisma } from "../src/core/database/prisma";
import { Prisma } from "@prisma/client";

/**
 * fullServerSetup.ts
 *
 * Script idempotente para poblar UN servidor con todo lo necesario:
 * - Economy items (herramientas, armas, materiales, cofres, pociones)
 * - Item recipes (crafteo)
 * - Item mutations (encantamientos)
 * - Game areas y niveles
 * - Mobs con drops
 * - Opcional: programar ataques de mobs demo
 *
 * Uso: provee GUILD_ID como variable de entorno opcional. Si no se provee, usa el id por defecto.
 *  GUILD_ID=1316592320954630144 npx tsx scripts/fullServerSetup.ts
 */

const DEFAULT_GUILD = process.env.GUILD_ID ?? "1316592320954630144";

async function upsertEconomyItem(
  guildId: string | null,
  key: string,
  data: Omit<Prisma.EconomyItemUncheckedCreateInput, "key" | "guildId">
) {
  const existing = await prisma.economyItem.findFirst({
    where: { key, guildId },
  });
  if (existing)
    return prisma.economyItem.update({
      where: { id: existing.id },
      data: { ...data },
    });
  return prisma.economyItem.create({ data: { ...data, key, guildId } });
}

async function upsertGameArea(
  guildId: string | null,
  key: string,
  data: Omit<Prisma.GameAreaUncheckedCreateInput, "key" | "guildId">
) {
  const existing = await prisma.gameArea.findFirst({ where: { key, guildId } });
  if (existing)
    return prisma.gameArea.update({
      where: { id: existing.id },
      data: { ...data },
    });
  return prisma.gameArea.create({ data: { ...data, key, guildId } });
}

async function upsertMob(
  guildId: string | null,
  key: string,
  data: Omit<Prisma.MobUncheckedCreateInput, "key" | "guildId">
) {
  const existing = await prisma.mob.findFirst({ where: { key, guildId } });
  if (existing)
    return prisma.mob.update({ where: { id: existing.id }, data: { ...data } });
  return prisma.mob.create({ data: { ...data, key, guildId } });
}

async function upsertItemRecipe(
  guildId: string | null,
  productKey: string,
  ingredients: { itemKey: string; qty: number }[],
  productQty = 1
) {
  // Ensure product exists
  const product = await prisma.economyItem.findFirst({
    where: { key: productKey, OR: [{ guildId }, { guildId: null }] },
    orderBy: [{ guildId: "desc" }],
  });
  if (!product) throw new Error(`Product item not found: ${productKey}`);

  // Find existing recipe by productItemId
  const existing = await prisma.itemRecipe.findUnique({
    where: { productItemId: product.id },
  });
  if (existing) {
    // Recreate ingredients set
    await prisma.recipeIngredient.deleteMany({
      where: { recipeId: existing.id },
    });
    for (const ing of ingredients) {
      const it = await prisma.economyItem.findFirst({
        where: { key: ing.itemKey, OR: [{ guildId }, { guildId: null }] },
        orderBy: [{ guildId: "desc" }],
      });
      if (!it) throw new Error(`Ingredient item not found: ${ing.itemKey}`);
      await prisma.recipeIngredient.create({
        data: { recipeId: existing.id, itemId: it.id, quantity: ing.qty },
      });
    }
    return existing;
  }

  const r = await prisma.itemRecipe.create({
    data: { productItemId: product.id, productQuantity: productQty },
  });
  for (const ing of ingredients) {
    const it = await prisma.economyItem.findFirst({
      where: { key: ing.itemKey, OR: [{ guildId }, { guildId: null }] },
      orderBy: [{ guildId: "desc" }],
    });
    if (!it) throw new Error(`Ingredient item not found: ${ing.itemKey}`);
    await prisma.recipeIngredient.create({
      data: { recipeId: r.id, itemId: it.id, quantity: ing.qty },
    });
  }
  return r;
}

export async function runFullServerSetup(
  guildIdArg?: string | null,
  options?: { dryRun?: boolean }
) {
  const guildId = guildIdArg ?? DEFAULT_GUILD;
  console.log("Starting full server setup for guild=", guildId, options ?? {});

  // --- Items: tools, weapons, materials ---
  await upsertEconomyItem(guildId, "tool.pickaxe.basic", {
    name: "Pico Básico",
    stackable: false,
    props: {
      tool: { type: "pickaxe", tier: 1 },
      breakable: { enabled: true, maxDurability: 100, durabilityPerUse: 5 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["tool", "mine"],
  });

  await upsertEconomyItem(guildId, "tool.pickaxe.iron", {
    name: "Pico de Hierro",
    stackable: false,
    props: {
      tool: { type: "pickaxe", tier: 2 },
      breakable: { enabled: true, maxDurability: 180, durabilityPerUse: 4 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["tool", "mine", "tier2"],
  });

  await upsertEconomyItem(guildId, "weapon.sword.iron", {
    name: "Espada de Hierro",
    stackable: false,
    props: {
      damage: 10,
      tool: { type: "sword", tier: 1 },
      breakable: { enabled: true, maxDurability: 150, durabilityPerUse: 2 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["weapon"],
  });

  await upsertEconomyItem(guildId, "armor.leather.basic", {
    name: "Armadura de Cuero",
    stackable: false,
    props: { defense: 3 } as unknown as Prisma.InputJsonValue,
    tags: ["armor"],
  });

  await upsertEconomyItem(guildId, "ore.iron", {
    name: "Mineral de Hierro",
    stackable: true,
    props: { craftingOnly: true } as unknown as Prisma.InputJsonValue,
    tags: ["ore", "common"],
  });
  await upsertEconomyItem(guildId, "ingot.iron", {
    name: "Lingote de Hierro",
    stackable: true,
    props: {} as unknown as Prisma.InputJsonValue,
    tags: ["ingot", "metal"],
  });

  // Consumibles y pociones
  await upsertEconomyItem(guildId, "food.meat.small", {
    name: "Carne Pequeña",
    stackable: true,
    props: {
      food: { healHp: 8, cooldownSeconds: 20 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["food"],
  });
  await upsertEconomyItem(guildId, "potion.energy", {
    name: "Poción Energética",
    stackable: true,
    props: {
      potion: { removeEffects: ["FATIGUE"], cooldownSeconds: 90 },
    } as unknown as Prisma.InputJsonValue,
    tags: ["potion", "utility"],
  });

  // Cofre con recompensas
  await upsertEconomyItem(guildId, "chest.daily", {
    name: "Cofre Diario",
    stackable: true,
    props: {
      chest: {
        enabled: true,
        consumeOnOpen: true,
        randomMode: "single",
        rewards: [
          { type: "coins", amount: 200 },
          { type: "item", itemKey: "ingot.iron", qty: 2 },
        ],
      },
    } as unknown as Prisma.InputJsonValue,
    tags: ["chest"],
  });

  // --- Mutations / enchants catalog ---
  // Item mutations (catalog)
  const existingRuby = await prisma.itemMutation.findFirst({
    where: { key: "ruby_core", guildId },
  });
  if (existingRuby) {
    await prisma.itemMutation.update({
      where: { id: existingRuby.id },
      data: { name: "Núcleo de Rubí", effects: { damageBonus: 15 } as any },
    });
  } else {
    await prisma.itemMutation.create({
      data: {
        key: "ruby_core",
        name: "Núcleo de Rubí",
        guildId,
        effects: { damageBonus: 15 } as any,
      } as any,
    });
  }

  const existingEmerald = await prisma.itemMutation.findFirst({
    where: { key: "emerald_core", guildId },
  });
  if (existingEmerald) {
    await prisma.itemMutation.update({
      where: { id: existingEmerald.id },
      data: {
        name: "Núcleo de Esmeralda",
        effects: { defenseBonus: 10, maxHpBonus: 20 } as any,
      },
    });
  } else {
    await prisma.itemMutation.create({
      data: {
        key: "emerald_core",
        name: "Núcleo de Esmeralda",
        guildId,
        effects: { defenseBonus: 10, maxHpBonus: 20 } as any,
      } as any,
    });
  }

  // --- Recipes (crafteo): iron_ingot <- iron ore x3
  // Create ingredient items if missing
  await upsertEconomyItem(guildId, "ingot.iron", {
    name: "Lingote de Hierro",
    stackable: true,
    props: {} as unknown as Prisma.InputJsonValue,
    tags: ["ingot"],
  });
  await upsertEconomyItem(guildId, "ore.iron", {
    name: "Mineral de Hierro",
    stackable: true,
    props: {} as unknown as Prisma.InputJsonValue,
    tags: ["ore"],
  });
  await upsertItemRecipe(
    guildId,
    "ingot.iron",
    [{ itemKey: "ore.iron", qty: 3 }],
    1
  );

  // --- Areas & Levels ---
  const mine = await upsertGameArea(guildId, "mine.cavern", {
    name: "Mina: Caverna",
    type: "MINE",
    config: { cooldownSeconds: 10 } as unknown as Prisma.InputJsonValue,
  });
  await prisma.gameAreaLevel.upsert({
    where: { areaId_level: { areaId: mine.id, level: 1 } },
    update: {},
    create: {
      areaId: mine.id,
      level: 1,
      requirements: {
        tool: { required: true, toolType: "pickaxe", minTier: 1 },
      } as any,
      rewards: {
        draws: 2,
        table: [
          { type: "item", itemKey: "ore.iron", qty: 2, weight: 70 },
          { type: "coins", amount: 10, weight: 30 },
        ],
      } as any,
      mobs: {
        draws: 1,
        table: [
          { mobKey: "slime.green", weight: 50 },
          { mobKey: "bat", weight: 50 },
        ],
      } as any,
    },
  });

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
      } as any,
      rewards: {
        draws: 2,
        table: [
          { type: "item", itemKey: "food.meat.small", qty: 1, weight: 70 },
          { type: "coins", amount: 10, weight: 30 },
        ],
      } as any,
      mobs: { draws: 0, table: [] } as any,
    },
  });

  // --- Basic mobs ---
  await upsertMob(guildId, "slime.green", {
    name: "Slime Verde",
    stats: { attack: 4, hp: 18 } as any,
    drops: [{ itemKey: "ingot.iron", qty: 1, weight: 10 }] as any,
  });
  await upsertMob(guildId, "bat", {
    name: "Murciélago",
    stats: { attack: 3, hp: 10 } as any,
    drops: Prisma.DbNull,
  });

  // Advanced mobs
  await upsertMob(guildId, "goblin", {
    name: "Duende",
    stats: { attack: 8, hp: 30 } as any,
    drops: [{ itemKey: "ore.iron", qty: 1, weight: 50 }] as any,
  });
  await upsertMob(guildId, "orc", {
    name: "Orco",
    stats: { attack: 12, hp: 50 } as any,
    drops: Prisma.DbNull,
  });

  // Programar un par de ataques demo (opcional)
  const targetUser = process.env.TARGET_USER ?? null;
  if (targetUser) {
    const slime = await prisma.mob.findFirst({
      where: { key: "slime.green", OR: [{ guildId }, { guildId: null }] },
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

  console.log("Full server setup complete.");
}

// Backwards-compatible CLI entry
if (require.main === module) {
  const gid = process.env.GUILD_ID ?? DEFAULT_GUILD;
  runFullServerSetup(gid)
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
