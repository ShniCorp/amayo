/**
 * Test de creación de flag específico
 */

import { featureFlagService } from "../src/core/services/FeatureFlagService";
import { FeatureFlagConfig } from "../src/core/types/featureFlags";

async function testCreateFlag() {
  console.log("🧪 Test: Crear flag problemático\n");

  try {
    await featureFlagService.initialize();
    console.log("✅ Servicio inicializado\n");

    const testFlag: FeatureFlagConfig = {
      name: "2025-10-alianzas-blacklist",
      description: "Blacklist de alianzas para octubre 2025",
      status: "disabled",
      target: "global",
    };

    console.log("📝 Intentando crear flag:", testFlag.name);
    await featureFlagService.setFlag(testFlag);
    console.log("✅ Flag creado exitosamente");

    // Verificar
    const flag = featureFlagService.getFlag(testFlag.name);
    console.log("\n📊 Flag guardado:", flag);

    // Limpieza
    await featureFlagService.removeFlag(testFlag.name);
    console.log("\n🗑️  Flag eliminado");
  } catch (error: any) {
    console.error("\n❌ ERROR:");
    console.error("Message:", error?.message);
    console.error("Stack:", error?.stack);
    console.error("Code:", error?.code);
    console.error("Meta:", error?.meta);
    console.error("Full error:", error);
  }
}

testCreateFlag();
