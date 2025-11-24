/**
 * Script de Debug: Inspeccionar inventario de usuario específico
 *
 * Verifica estado actual de items de herramientas para diagnosticar el problema
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2];
  const guildId = process.argv[3];

  if (!userId || !guildId) {
    console.error(
      "❌ Uso: npx tsx scripts/debugInventory.ts <userId> <guildId>"
    );
    process.exit(1);
  }

  console.log(
    `🔍 Inspeccionando inventario de usuario ${userId.slice(
      0,
      8
    )}... en guild ${guildId.slice(0, 8)}...\n`
  );

  // Obtener todas las entradas de inventario del usuario
  const entries = await prisma.inventoryEntry.findMany({
    where: { userId, guildId },
    include: { item: true },
  });

  console.log(`📦 Total de items: ${entries.length}\n`);

  for (const entry of entries) {
    const item = entry.item;
    const state = entry.state as any;
    const instances = state?.instances ?? [];

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📦 Item: ${item.name} (${item.key})`);
    console.log(`   Stackable: ${item.stackable}`);
    console.log(`   Quantity: ${entry.quantity}`);
    console.log(`   Props:`, JSON.stringify(item.props, null, 2));
    console.log(`   State.instances:`, JSON.stringify(instances, null, 2));

    if (!item.stackable && entry.quantity > 1 && instances.length === 0) {
      console.log(
        `   ⚠️  PROBLEMA: Non-stackable con quantity>1 pero sin instances`
      );
    }

    if (instances.length > 0) {
      console.log(`   📊 Resumen de instancias:`);
      instances.forEach((inst: any, idx: number) => {
        console.log(`      [${idx}] Durabilidad: ${inst.durability ?? "N/A"}`);
      });
    }
    console.log("");
  }

  // Verificar equipo
  const equipment = await prisma.playerEquipment.findUnique({
    where: { userId_guildId: { userId, guildId } },
  });

  if (equipment) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🧰 Equipo equipado:`);
    if (equipment.weaponItemId) {
      const weapon = await prisma.economyItem.findUnique({
        where: { id: equipment.weaponItemId },
      });
      console.log(`   Arma: ${weapon?.name ?? "Desconocida"} (${weapon?.key})`);
    } else {
      console.log(`   Arma: ❌ NINGUNA EQUIPADA`);
    }

    if (equipment.armorItemId) {
      const armor = await prisma.economyItem.findUnique({
        where: { id: equipment.armorItemId },
      });
      console.log(
        `   Armadura: ${armor?.name ?? "Desconocida"} (${armor?.key})`
      );
    } else {
      console.log(`   Armadura: (Ninguna)`);
    }

    if (equipment.capeItemId) {
      const cape = await prisma.economyItem.findUnique({
        where: { id: equipment.capeItemId },
      });
      console.log(`   Capa: ${cape?.name ?? "Desconocida"} (${cape?.key})`);
    } else {
      console.log(`   Capa: (Ninguna)`);
    }
  } else {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🧰 Equipo: ❌ Sin registro de equipo`);
  }
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
