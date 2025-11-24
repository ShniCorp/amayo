/**
 * Debug del sistema de Feature Flags
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugFeatureFlags() {
  console.log("🔍 Debugging Feature Flags...\n");

  try {
    // Listar todos los flags
    const flags = await prisma.featureFlag.findMany();
    console.log(`📊 Total de flags en DB: ${flags.length}\n`);

    if (flags.length === 0) {
      console.log("ℹ️  No hay flags en la base de datos");
      return;
    }

    // Mostrar cada flag
    for (const flag of flags) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🎯 Flag: ${flag.name}`);
      console.log(`   ID: ${flag.id}`);
      console.log(`   Status: ${flag.status}`);
      console.log(`   Target: ${flag.target}`);
      console.log(`   Description: ${flag.description || "N/A"}`);
      console.log(`   Rollout Strategy: ${flag.rolloutStrategy || "N/A"}`);
      console.log(`   Rollout Config: ${flag.rolloutConfig || "N/A"}`);
      console.log(`   Start Date: ${flag.startDate || "N/A"}`);
      console.log(`   End Date: ${flag.endDate || "N/A"}`);
      console.log(`   Created: ${flag.createdAt}`);
      console.log(`   Updated: ${flag.updatedAt}`);

      // Verificar si hay problemas con los datos
      if (flag.rolloutConfig) {
        try {
          const parsed = JSON.parse(flag.rolloutConfig);
          console.log(`   ✅ Rollout Config parseable:`, parsed);
        } catch (e: any) {
          console.log(`   ❌ ERROR parseando Rollout Config: ${e.message}`);
        }
      }

      if (flag.metadata) {
        try {
          const parsed = JSON.parse(flag.metadata);
          console.log(`   ✅ Metadata parseable:`, parsed);
        } catch (e: any) {
          console.log(`   ❌ ERROR parseando Metadata: ${e.message}`);
        }
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Test de creación
    console.log("🧪 Test: Crear flag temporal...");
    const testFlag = await prisma.featureFlag.create({
      data: {
        name: `test_flag_${Date.now()}`,
        description: "Flag de test temporal",
        status: "disabled",
        target: "global",
      },
    });
    console.log(`✅ Flag creado: ${testFlag.name}`);

    // Limpiar
    await prisma.featureFlag.delete({
      where: { name: testFlag.name },
    });
    console.log(`🗑️  Flag eliminado: ${testFlag.name}\n`);

    console.log("✅ Sistema funcionando correctamente");
  } catch (error: any) {
    console.error("❌ ERROR:", error.message);
    console.error("Stack:", error.stack);
    console.error("Code:", error.code);
    console.error("Meta:", error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

debugFeatureFlags();
