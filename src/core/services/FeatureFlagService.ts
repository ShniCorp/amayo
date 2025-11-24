/**
 * Feature Flag Service
 * Sistema de control de features para rollouts progresivos, A/B testing y feature toggles
 *
 * Características:
 * - Rollouts progresivos por porcentaje
 * - Whitelisting/blacklisting de usuarios/guilds
 * - A/B testing
 * - Caché en memoria para performance
 * - Persistencia en Prisma
 * - Sistema de evaluación con contexto
 */

import { Collection } from "discord.js";
import { prisma } from "../database/prisma";
import logger from "../lib/logger";
import {
  FeatureFlagConfig,
  FeatureFlagContext,
  FeatureFlagEvaluation,
  FeatureFlagStats,
  FeatureFlagStatus,
  RolloutStrategy,
  RolloutConfigSchema,
} from "../types/featureFlags";
import { featureFlagEvaluator } from "./FeatureFlagEvaluator";

class FeatureFlagService {
  // Caché en memoria para flags (evitar golpear DB constantemente)
  private flagsCache: Collection<string, FeatureFlagConfig>;

  // Caché de evaluaciones por contexto (para consistencia en la sesión)
  private evaluationCache: Collection<string, Map<string, boolean>>;

  // Stats en memoria
  private stats: Collection<string, FeatureFlagStats>;

  // TTL del caché (5 minutos)
  private cacheTTL: number = 5 * 60 * 1000;

  // Última actualización del caché
  private lastCacheUpdate: number = 0;

  // Flag para saber si está inicializado
  private initialized: boolean = false;

  constructor() {
    this.flagsCache = new Collection();
    this.evaluationCache = new Collection();
    this.stats = new Collection();
  }

  /**
   * Inicializa el servicio y carga los flags desde la DB
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn("[FeatureFlags] Ya inicializado, omitiendo...");
      return;
    }

    try {
      logger.info("[FeatureFlags] Inicializando servicio...");
      await this.refreshCache();
      this.initialized = true;
      logger.info(
        `[FeatureFlags] Inicializado con ${this.flagsCache.size} flags`
      );
    } catch (error: any) {
      logger.error({
        msg: "[FeatureFlags] Error al inicializar",
        error: {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          code: error?.code,
        },
      });
      // No lanzamos error para permitir que el bot arranque en modo fail-safe
    }
  }

  /**
   * Refresca el caché de flags desde la base de datos
   */
  async refreshCache(): Promise<void> {
    try {
      const flags = await prisma.featureFlag.findMany();

      this.flagsCache.clear();

      for (const flag of flags) {
        // Parsear y validar rolloutConfig
        let rolloutConfig = undefined;
        if (flag.rolloutConfig) {
          try {
            const parsed = JSON.parse(flag.rolloutConfig);
            const validation = RolloutConfigSchema.safeParse(parsed);
            if (validation.success) {
              rolloutConfig = validation.data;
            } else {
              logger.warn(
                `[FeatureFlags] Configuración de rollout inválida para "${flag.name}":`,
                validation.error
              );
            }
          } catch (e) {
            logger.warn(
              `[FeatureFlags] Error al parsear rolloutConfig para "${flag.name}"`
            );
          }
        }

        // Parsear metadata
        let metadata = undefined;
        if (flag.metadata) {
          try {
            metadata = JSON.parse(flag.metadata);
          } catch (e) {
            logger.warn(
              `[FeatureFlags] Error al parsear metadata para "${flag.name}"`
            );
          }
        }

        const config: FeatureFlagConfig = {
          name: flag.name,
          description: flag.description || undefined,
          status: flag.status as FeatureFlagStatus,
          target: flag.target as any,
          rolloutStrategy: (flag.rolloutStrategy as RolloutStrategy) || undefined,
          rolloutConfig,
          startDate: flag.startDate || undefined,
          endDate: flag.endDate || undefined,
          metadata,
          createdAt: flag.createdAt,
          updatedAt: flag.updatedAt,
        };

        this.flagsCache.set(flag.name, config);
      }

      this.lastCacheUpdate = Date.now();
      // Limpiar caché de evaluaciones al refrescar flags
      this.evaluationCache.clear();

      logger.debug(
        `[FeatureFlags] Caché actualizado: ${this.flagsCache.size} flags`
      );
    } catch (error: any) {
      logger.error({
        msg: "[FeatureFlags] Error al refrescar caché",
        error: {
          message: error?.message,
          stack: error?.stack,
          code: error?.code,
          meta: error?.meta,
        },
      });
      throw error;
    }
  }

  /**
   * Fuerza el refresco de un flag específico (útil para webhooks o comandos de admin)
   */
  async forceRefresh(flagName?: string): Promise<void> {
    await this.refreshCache();
  }

  /**
   * Verifica si el caché necesita actualizarse
   */
  private async checkCacheValidity(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.cacheTTL) {
      await this.refreshCache();
    }
  }

  /**
   * Evalúa si un feature flag está habilitado para un contexto dado
   */
  async isEnabled(
    flagName: string,
    context: FeatureFlagContext = {}
  ): Promise<boolean> {
    try {
      await this.checkCacheValidity();

      const flag = this.flagsCache.get(flagName);

      // Si el flag no existe, asumimos deshabilitado
      if (!flag) {
        // Solo loguear en debug para no saturar logs si se consulta mucho un flag inexistente
        logger.debug(
          `[FeatureFlags] Flag "${flagName}" no encontrado, retornando false`
        );
        return false;
      }

      // Verificar si hay una evaluación cacheada para este contexto
      const cacheKey = this.generateContextKey(flagName, context);
      const contextCache = this.evaluationCache.get(cacheKey);
      if (contextCache !== undefined) {
        const cachedResult = contextCache.get(flagName);
        if (cachedResult !== undefined) {
          return cachedResult;
        }
      }

      // Evaluar el flag usando el Evaluator separado
      const evaluation = featureFlagEvaluator.evaluate(flag, context);

      // Cachear resultado
      this.cacheEvaluation(cacheKey, flagName, evaluation.enabled);

      // Actualizar stats
      this.updateStats(flagName, evaluation.enabled);

      logger.debug(
        `[FeatureFlags] "${flagName}" evaluado: ${evaluation.enabled} (${evaluation.reason})`
      );

      return evaluation.enabled;
    } catch (error) {
      logger.error({ err: error }, `[FeatureFlags] Error al evaluar "${flagName}"`);
      return false; // Fail-safe: si hay error, deshabilitamos
    }
  }

  /**
   * Genera una clave única para el contexto
   */
  private generateContextKey(
    flagName: string,
    context: FeatureFlagContext
  ): string {
    return `${flagName}:${context.userId || "none"}:${context.guildId || "none"
      }:${context.channelId || "none"}`;
  }

  /**
   * Cachea una evaluación
   */
  private cacheEvaluation(
    contextKey: string,
    flagName: string,
    enabled: boolean
  ): void {
    if (!this.evaluationCache.has(contextKey)) {
      this.evaluationCache.set(contextKey, new Map());
    }
    this.evaluationCache.get(contextKey)!.set(flagName, enabled);
  }

  /**
   * Actualiza las estadísticas de un flag
   */
  private updateStats(flagName: string, enabled: boolean): void {
    if (!this.stats.has(flagName)) {
      this.stats.set(flagName, {
        flagName,
        totalEvaluations: 0,
        enabledCount: 0,
        disabledCount: 0,
        enablementRate: 0,
        lastEvaluation: new Date(),
      });
    }

    const stats = this.stats.get(flagName)!;
    stats.totalEvaluations++;
    if (enabled) {
      stats.enabledCount++;
    } else {
      stats.disabledCount++;
    }
    stats.enablementRate = (stats.enabledCount / stats.totalEvaluations) * 100;
    stats.lastEvaluation = new Date();
  }

  /**
   * Crea o actualiza un feature flag
   */
  async setFlag(config: FeatureFlagConfig): Promise<void> {
    try {
      const data = {
        name: config.name,
        description: config.description || null,
        status: config.status,
        target: config.target,
        rolloutStrategy: config.rolloutStrategy || null,
        rolloutConfig: config.rolloutConfig
          ? JSON.stringify(config.rolloutConfig)
          : null,
        startDate: config.startDate || null,
        endDate: config.endDate || null,
        metadata: config.metadata ? JSON.stringify(config.metadata) : null,
      };

      await prisma.featureFlag.upsert({
        where: { name: config.name },
        create: data,
        update: data,
      });

      // Actualizar caché local inmediatamente
      this.flagsCache.set(config.name, config);
      // Limpiar caché de evaluaciones para este flag
      this.clearEvaluationCache();

      logger.info(`[FeatureFlags] Flag "${config.name}" actualizado`);
    } catch (error: any) {
      logger.error({
        msg: `[FeatureFlags] Error al setear flag "${config.name}"`,
        error: {
          message: error?.message,
          stack: error?.stack,
          code: error?.code,
          meta: error?.meta,
        },
      });
      throw error;
    }
  }

  /**
   * Elimina un feature flag
   */
  async removeFlag(flagName: string): Promise<void> {
    try {
      await prisma.featureFlag.delete({
        where: { name: flagName },
      });

      this.flagsCache.delete(flagName);
      this.stats.delete(flagName);
      this.clearEvaluationCache();

      logger.info(`[FeatureFlags] Flag "${flagName}" eliminado`);
    } catch (error: any) {
      logger.error({
        msg: `[FeatureFlags] Error al eliminar flag "${flagName}"`,
        error: {
          message: error?.message,
          stack: error?.stack,
          code: error?.code,
          meta: error?.meta,
        },
      });
      throw error;
    }
  }

  /**
   * Obtiene todos los flags
   */
  getFlags(): FeatureFlagConfig[] {
    return Array.from(this.flagsCache.values());
  }

  /**
   * Obtiene un flag específico
   */
  getFlag(flagName: string): FeatureFlagConfig | undefined {
    return this.flagsCache.get(flagName);
  }

  /**
   * Obtiene las estadísticas de un flag
   */
  getStats(flagName: string): FeatureFlagStats | undefined {
    return this.stats.get(flagName);
  }

  /**
   * Obtiene todas las estadísticas
   */
  getAllStats(): FeatureFlagStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Limpia el caché de evaluaciones
   */
  clearEvaluationCache(): void {
    this.evaluationCache.clear();
    logger.info("[FeatureFlags] Caché de evaluaciones limpiado");
  }
}

// Singleton
export const featureFlagService = new FeatureFlagService();
