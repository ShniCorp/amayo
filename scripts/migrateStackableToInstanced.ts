/**
 * Script de Migración: Stackable Items → Instanced Items con Durabilidad
 *
 * Problema:
 * - Items de herramientas/armas en DB tienen stackable=true (error de versión antigua)
 * - Inventarios tienen quantity>1 sin state.instances con durabilidad
 * - Esto causa que reduceToolDurability decremente quantity en lugar de degradar durabilidad
 *
 * Solución:
 * 1. Actualizar EconomyItem: stackable=false para tools/weapons/armor/capes
 * 2. Migrar InventoryEntry: convertir quantity a state.instances[] con durabilidad inicializada
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type ItemProps = {
  breakable?: {
    enabled?: boolean;
    maxDurability?: number;
    durabilityPerUse?: number;
  };
  tool?: { type: string; tier?: number };
  damage?: number;
  defense?: number;
  [k: string]: unknown;
};

type InventoryState = {
  instances?: Array<{
    durability?: number;
    expiresAt?: string;
    notes?: string;
    mutations?: string[];
  }>;
  notes?: string;
  [k: string]: unknown;
};

async function main() {
  console.log("🔧 Iniciando migración de items stackable...\n");

  // PASO 1: Actualizar definiciones de items
  console.log("📝 PASO 1: Actualizando EconomyItem (stackable → false)...");
  const itemUpdateResult = await prisma.$executeRaw`
    UPDATE "EconomyItem"
    SET "stackable" = false
    WHERE "key" LIKE 'tool.%'
       OR "key" LIKE 'weapon.%'
       OR "key" LIKE 'armor.%'
       OR "key" LIKE 'cape.%'
  `;
  console.log(`✅ ${itemUpdateResult} items actualizados\n`);

  // PASO 2: Obtener items que ahora son non-stackable
  const nonStackableItems = await prisma.economyItem.findMany({
    where: {
      stackable: false,
      OR: [
        { key: { startsWith: "tool." } },
        { key: { startsWith: "weapon." } },
        { key: { startsWith: "armor." } },
        { key: { startsWith: "cape." } },
      ],
    },
  });

  console.log(
    `📦 ${nonStackableItems.length} items non-stackable identificados\n`
  );

  // PASO 3: Migrar inventarios
  console.log("🔄 PASO 2: Migrando inventarios...");

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const item of nonStackableItems) {
    const props = (item.props as ItemProps | null) ?? {};
    const breakable = props.breakable;
    const maxDurability =
      breakable?.enabled !== false
        ? breakable?.maxDurability ?? 100
        : undefined;

    // Encontrar todas las entradas de inventario de este item con quantity>1 o sin instances
    const entries = await prisma.inventoryEntry.findMany({
      where: { itemId: item.id },
    });

    for (const entry of entries) {
      try {
        const currentState = (entry.state as InventoryState | null) ?? {};
        const currentInstances = currentState.instances ?? [];
        const currentQuantity = entry.quantity ?? 0;

        // Caso 1: quantity>1 pero sin instances (inventario corrupto de versión anterior)
        if (currentQuantity > 1 && currentInstances.length === 0) {
          console.log(
            `  🔧 Migrando: ${item.key} (user=${entry.userId.slice(
              0,
              8
            )}, qty=${currentQuantity})`
          );

          const newInstances: InventoryState["instances"] = [];
          for (let i = 0; i < currentQuantity; i++) {
            if (maxDurability && maxDurability > 0) {
              newInstances.push({ durability: maxDurability });
            } else {
              newInstances.push({});
            }
          }

          await prisma.inventoryEntry.update({
            where: { id: entry.id },
            data: {
              state: {
                ...currentState,
                instances: newInstances,
              } as unknown as Prisma.InputJsonValue,
              quantity: newInstances.length,
            },
          });

          migratedCount++;
        }
        // Caso 2: Instancia única sin durabilidad inicializada
        else if (currentQuantity === 1 && currentInstances.length === 0) {
          const newInstance =
            maxDurability && maxDurability > 0
              ? { durability: maxDurability }
              : {};

          await prisma.inventoryEntry.update({
            where: { id: entry.id },
            data: {
              state: {
                ...currentState,
                instances: [newInstance],
              } as unknown as Prisma.InputJsonValue,
              quantity: 1,
            },
          });

          migratedCount++;
        }
        // Caso 3: Ya tiene instances pero sin durabilidad inicializada
        else if (currentInstances.length > 0 && maxDurability) {
          let needsUpdate = false;
          const fixedInstances = currentInstances.map((inst) => {
            if (inst.durability == null) {
              needsUpdate = true;
              return { ...inst, durability: maxDurability };
            }
            return inst;
          });

          if (needsUpdate) {
            console.log(
              `  🔧 Reparando durabilidad: ${
                item.key
              } (user=${entry.userId.slice(0, 8)}, instances=${
                fixedInstances.length
              })`
            );
            await prisma.inventoryEntry.update({
              where: { id: entry.id },
              data: {
                state: {
                  ...currentState,
                  instances: fixedInstances,
                } as unknown as Prisma.InputJsonValue,
                quantity: fixedInstances.length,
              },
            });
            migratedCount++;
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error migrando entry ${entry.id}:`, error);
        errorCount++;
      }
    }
  }

  console.log("\n📊 Resumen de migración:");
  console.log(`  ✅ Entradas migradas: ${migratedCount}`);
  console.log(`  ⏭️  Entradas omitidas (ya correctas): ${skippedCount}`);
  console.log(`  ❌ Errores: ${errorCount}\n`);

  // PASO 4: Validación post-migración
  console.log("🔍 PASO 3: Validando integridad...");
  const inconsistentEntries = await prisma.$queryRaw<
    Array<{
      id: string;
      userId: string;
      key: string;
      quantity: number;
      state: any;
    }>
  >`
    SELECT 
      ie.id,
      ie."userId",
      ei.key,
      ie.quantity,
      ie.state
    FROM "InventoryEntry" ie
    JOIN "EconomyItem" ei ON ie."itemId" = ei.id
    WHERE ei."stackable" = false
      AND ie.quantity > 1
      AND (
        ie.state IS NULL 
        OR jsonb_array_length(COALESCE((ie.state->>'instances')::jsonb, '[]'::jsonb)) = 0
      )
  `;

  if (inconsistentEntries.length > 0) {
    console.log(
      `\n⚠️  ADVERTENCIA: ${inconsistentEntries.length} entradas inconsistentes detectadas:`
    );
    inconsistentEntries.forEach((entry) => {
      console.log(
        `  - ${entry.key} (user=${entry.userId.slice(0, 8)}, qty=${
          entry.quantity
        })`
      );
    });
    console.log(
      "\n❗ Ejecuta el comando admin !reset-inventory para estos usuarios\n"
    );
  } else {
    console.log("✅ No se detectaron inconsistencias\n");
  }

  console.log("🎉 Migración completada exitosamente");
}

main()
  .catch((error) => {
    console.error("❌ Error fatal durante migración:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
