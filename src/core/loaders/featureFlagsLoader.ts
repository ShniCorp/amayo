/**
 * Feature Flags Loader
 * Inicializa el servicio de feature flags al arrancar el bot
 */

import { featureFlagService } from "../services/FeatureFlagService";
import logger from "../lib/logger";

export async function loadFeatureFlags(): Promise<void> {
  try {
    logger.info("[FeatureFlags] Inicializando servicio...");
    await featureFlagService.initialize();
    logger.info("[FeatureFlags] ✅ Servicio inicializado correctamente");
  } catch (error: any) {
    logger.error("[FeatureFlags] ❌ Error al inicializar:");
    logger.error("[FeatureFlags] Message:", error?.message);
    logger.error("[FeatureFlags] Stack:", error?.stack);
    logger.error("[FeatureFlags] Code:", error?.code);
    logger.error("[FeatureFlags] Meta:", error?.meta);
    // No lanzamos el error para no bloquear el arranque del bot
    // El servicio funcionará en modo fail-safe (todos los flags disabled)
  }
}

export default loadFeatureFlags;
