/**
 * Test que simula el flujo completo del comando /featureflags create
 * para reproducir el error "Cannot read properties of undefined (reading 'upsert')"
 */

import { featureFlagService } from "../src/core/services/FeatureFlagService";
import { FeatureFlagConfig } from "../src/core/types/featureFlags";

async function simulateDiscordCommand() {
  console.log("🎮 Simulando comando /featureflags create desde Discord\n");

  try {
    // Paso 1: Inicializar servicio (como lo haría el bot al arrancar)
    console.log("1️⃣ Inicializando servicio (bot startup)...");
    await featureFlagService.initialize();
    console.log("✅ Servicio inicializado\n");

    // Paso 2: Simular un delay (como si el bot ya estuviera corriendo)
    console.log("2️⃣ Esperando 500ms (simulando bot en runtime)...");
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("✅ Delay completado\n");

    // Paso 3: Simular el comando /featureflags create (handleCreate)
    console.log("3️⃣ Ejecutando handleCreate (como en el comando Discord)...");

    const config: FeatureFlagConfig = {
      name: "2025-10-alianza-blacklist", // Mismo nombre del error
      description: "Test flag desde comando Discord",
      status: "disabled",
      target: "global",
    };

    console.log("   Llamando a featureFlagService.setFlag()...");
    await featureFlagService.setFlag(config);
    console.log("✅ Flag creado exitosamente\n");

    // Paso 4: Verificar
    console.log("4️⃣ Verificando flag...");
    const flag = featureFlagService.getFlag(config.name);
    console.log("   Flag:", flag);
    console.log("✅ Verificación completa\n");

    // Paso 5: Cleanup
    console.log("5️⃣ Limpiando...");
    await featureFlagService.removeFlag(config.name);
    console.log("✅ Flag eliminado\n");

    console.log("🎉 Test completado sin errores");
  } catch (error: any) {
    console.error("\n❌ ERROR CAPTURADO:");
    console.error("Message:", error?.message);
    console.error("Stack:", error?.stack);
    console.error("Code:", error?.code);
    console.error("\nTipo de error:", error?.constructor?.name);

    // Diagnóstico adicional
    console.error("\n🔍 Diagnóstico adicional:");
    try {
      const { prisma } = await import("../src/core/database/prisma");
      console.error("   prisma:", typeof prisma);
      console.error(
        "   prisma.featureFlag:",
        typeof (prisma as any).featureFlag
      );
      console.error(
        "   Keys de prisma:",
        Object.keys(prisma as any).slice(0, 30)
      );
    } catch (diagError) {
      console.error(
        "   No se pudo acceder a prisma para diagnóstico:",
        diagError
      );
    }

    process.exit(1);
  }
}

simulateDiscordCommand();
