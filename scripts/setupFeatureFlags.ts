/**
 * Setup inicial del sistema de Feature Flags
 *
 * Este script:
 * 1. Crea algunos feature flags de ejemplo
 * 2. Muestra cómo configurar diferentes estrategias
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupFeatureFlags() {
  console.log("🎮 Configurando Feature Flags de ejemplo...\n");

  try {
    // 1. Flag deshabilitado por defecto (en desarrollo)
    await prisma.featureFlag.upsert({
      where: { name: "new_shop_system" },
      create: {
        name: "new_shop_system",
        description: "Nuevo sistema de tienda con UI mejorada",
        status: "disabled",
        target: "global",
      },
      update: {},
    });
    console.log('✅ Flag "new_shop_system" creado (disabled)');

    // 2. Flag habilitado globalmente
    await prisma.featureFlag.upsert({
      where: { name: "inventory_ui_v2" },
      create: {
        name: "inventory_ui_v2",
        description: "Nueva UI del inventario con mejor UX",
        status: "enabled",
        target: "global",
      },
      update: {},
    });
    console.log('✅ Flag "inventory_ui_v2" creado (enabled)');

    // 3. Flag con rollout por porcentaje (25% de usuarios)
    await prisma.featureFlag.upsert({
      where: { name: "improved_combat_algorithm" },
      create: {
        name: "improved_combat_algorithm",
        description: "Algoritmo de combate mejorado con mejor balance",
        status: "rollout",
        target: "user",
        rolloutStrategy: "percentage",
        rolloutConfig: JSON.stringify({
          percentage: 25,
        }),
      },
      update: {},
    });
    console.log('✅ Flag "improved_combat_algorithm" creado (rollout 25%)');

    // 4. Flag con rollout gradual (de 10% a 100% en 7 días)
    const startDate = new Date();
    await prisma.featureFlag.upsert({
      where: { name: "economy_system_v2" },
      create: {
        name: "economy_system_v2",
        description: "Sistema de economía rediseñado",
        status: "rollout",
        target: "user",
        rolloutStrategy: "gradual",
        rolloutConfig: JSON.stringify({
          gradual: {
            startPercentage: 10,
            targetPercentage: 100,
            durationDays: 7,
          },
        }),
        startDate,
      },
      update: {},
    });
    console.log('✅ Flag "economy_system_v2" creado (gradual rollout)');

    // 5. Flag de evento temporal (Halloween)
    const halloweenStart = new Date("2025-10-25");
    const halloweenEnd = new Date("2025-11-01");
    await prisma.featureFlag.upsert({
      where: { name: "halloween_2025" },
      create: {
        name: "halloween_2025",
        description: "Evento de Halloween 2025",
        status: "enabled",
        target: "global",
        startDate: halloweenStart,
        endDate: halloweenEnd,
      },
      update: {},
    });
    console.log('✅ Flag "halloween_2025" creado (evento temporal)');

    // 6. Flag experimental con whitelist (solo para beta testers)
    await prisma.featureFlag.upsert({
      where: { name: "experimental_features" },
      create: {
        name: "experimental_features",
        description: "Funcionalidades experimentales solo para beta testers",
        status: "rollout",
        target: "user",
        rolloutStrategy: "whitelist",
        rolloutConfig: JSON.stringify({
          targetIds: [
            // Añade aquí los IDs de tus beta testers
            "BETA_TESTER_USER_ID_1",
            "BETA_TESTER_USER_ID_2",
          ],
        }),
      },
      update: {},
    });
    console.log('✅ Flag "experimental_features" creado (whitelist)');

    // 7. Flag premium con múltiples requisitos
    await prisma.featureFlag.upsert({
      where: { name: "premium_features" },
      create: {
        name: "premium_features",
        description: "Funcionalidades premium del bot",
        status: "disabled",
        target: "guild",
        metadata: JSON.stringify({
          requiresSubscription: true,
          tier: "premium",
        }),
      },
      update: {},
    });
    console.log('✅ Flag "premium_features" creado (disabled, metadata)');

    // 8. Flag en mantenimiento
    await prisma.featureFlag.upsert({
      where: { name: "trading_system" },
      create: {
        name: "trading_system",
        description: "Sistema de intercambio entre usuarios",
        status: "maintenance",
        target: "global",
      },
      update: {},
    });
    console.log('✅ Flag "trading_system" creado (maintenance)');

    console.log("\n🎉 Feature Flags de ejemplo creados exitosamente!");
    console.log("\n📝 Próximos pasos:");
    console.log("1. Usa /featureflags list para ver todos los flags");
    console.log("2. Usa /featureflags info flag:nombre para ver detalles");
    console.log(
      "3. Usa /featureflags update flag:nombre status:enabled para habilitar"
    );
    console.log("4. Lee README/FEATURE_FLAGS_SYSTEM.md para más información");
  } catch (error) {
    console.error("❌ Error al crear flags:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
setupFeatureFlags()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
