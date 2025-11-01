/**
 * Feature Flag Service
 * Sistema de control de features para rollouts progresivos, A/B testing y feature toggles
 *
 * Características:
 * - Rollouts progresivos por porcentaje
 * - Whitelisting/blacklisting de usuarios/guilds
 * - A/B testing
 * - Caché en memoria para performance
 * - Persistencia en Prisma + AppWrite
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
} from "../types/featureFlags";

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
      throw error;
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
        const config: FeatureFlagConfig = {
          name: flag.name,
          description: flag.description || undefined,
          status: flag.status as FeatureFlagStatus,
          target: flag.target as any,
          rolloutStrategy: flag.rolloutStrategy as RolloutStrategy | undefined,
          rolloutConfig: flag.rolloutConfig
            ? JSON.parse(flag.rolloutConfig as string)
            : undefined,
          startDate: flag.startDate || undefined,
          endDate: flag.endDate || undefined,
          metadata: flag.metadata
            ? JSON.parse(flag.metadata as string)
            : undefined,
          createdAt: flag.createdAt,
          updatedAt: flag.updatedAt,
        };

        this.flagsCache.set(flag.name, config);
      }

      this.lastCacheUpdate = Date.now();
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
        logger.warn(
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

      // Evaluar el flag
      const evaluation = await this.evaluate(flag, context);

      // Cachear resultado
      this.cacheEvaluation(cacheKey, flagName, evaluation.enabled);

      // Actualizar stats
      this.updateStats(flagName, evaluation.enabled);

      logger.debug(
        `[FeatureFlags] "${flagName}" evaluado: ${evaluation.enabled} (${evaluation.reason})`
      );

      return evaluation.enabled;
    } catch (error) {
      //@ts-ignore
      logger.error(`[FeatureFlags] Error al evaluar "${flagName}":`, error);
      return false; // Fail-safe: si hay error, deshabilitamos
    }
  }

  /**
   * Evalúa un flag según su configuración
   */
  private async evaluate(
    flag: FeatureFlagConfig,
    context: FeatureFlagContext
  ): Promise<FeatureFlagEvaluation> {
    const now = Date.now();

    // Verificar fechas de inicio/fin
    if (flag.startDate && now < flag.startDate.getTime()) {
      return {
        flagName: flag.name,
        enabled: false,
        reason: "Flag aún no iniciado",
        timestamp: now,
      };
    }

    if (flag.endDate && now > flag.endDate.getTime()) {
      return {
        flagName: flag.name,
        enabled: false,
        reason: "Flag expirado",
        timestamp: now,
      };
    }

    // Evaluar según status
    switch (flag.status) {
      case "enabled":
        return {
          flagName: flag.name,
          enabled: true,
          reason: "Flag habilitado globalmente",
          timestamp: now,
        };

      case "disabled":
        return {
          flagName: flag.name,
          enabled: false,
          reason: "Flag deshabilitado",
          timestamp: now,
        };

      case "maintenance":
        return {
          flagName: flag.name,
          enabled: false,
          reason: "Flag en mantenimiento",
          timestamp: now,
        };

      case "rollout":
        return this.evaluateRollout(flag, context, now);

      default:
        return {
          flagName: flag.name,
          enabled: false,
          reason: "Status desconocido",
          timestamp: now,
        };
    }
  }

  /**
   * Evalúa una estrategia de rollout
   */
  private evaluateRollout(
    flag: FeatureFlagConfig,
    context: FeatureFlagContext,
    timestamp: number
  ): FeatureFlagEvaluation {
    const strategy = flag.rolloutStrategy;
    const config = flag.rolloutConfig;

    if (!strategy || !config) {
      return {
        flagName: flag.name,
        enabled: false,
        reason: "Rollout sin configuración",
        strategy,
        timestamp,
      };
    }

    switch (strategy) {
      case "whitelist":
        return this.evaluateWhitelist(flag, context, timestamp);

      case "blacklist":
        return this.evaluateBlacklist(flag, context, timestamp);

      case "percentage":
        return this.evaluatePercentage(flag, context, timestamp);

      case "gradual":
        return this.evaluateGradual(flag, context, timestamp);

      case "random":
        return this.evaluateRandom(flag, context, timestamp);

      default:
        return {
          flagName: flag.name,
          enabled: false,
          reason: "Estrategia desconocida",
          strategy,
          timestamp,
        };
    }
  }

  /**
   * Evalúa estrategia de whitelist
   */
  private evaluateWhitelist(
    flag: FeatureFlagConfig,
    context: FeatureFlagContext,
    timestamp: number
  ): FeatureFlagEvaluation {
    const targetIds = flag.rolloutConfig?.targetIds || [];
    const contextId = this.getContextId(flag, context);

    const enabled = targetIds.includes(contextId);

    return {
      flagName: flag.name,
      enabled,
      reason: enabled ? "ID en whitelist" : "ID no en whitelist",
      strategy: "whitelist",
      timestamp,
    };
  }

  /**
   * Evalúa estrategia de blacklist
   */
  private evaluateBlacklist(
    flag: FeatureFlagConfig,
    context: FeatureFlagContext,
    timestamp: number
  ): FeatureFlagEvaluation {
    const targetIds = flag.rolloutConfig?.targetIds || [];
    const contextId = this.getContextId(flag, context);

    const enabled = !targetIds.includes(contextId);

    return {
      flagName: flag.name,
      enabled,
      reason: enabled ? "ID no en blacklist" : "ID en blacklist",
      strategy: "blacklist",
      timestamp,
    };
  }

  /**
   * Evalúa estrategia de porcentaje
   */
  private evaluatePercentage(
    flag: FeatureFlagConfig,
    context: FeatureFlagContext,
    timestamp: number
  ): FeatureFlagEvaluation {
    const percentage = flag.rolloutConfig?.percentage || 0;
    const contextId = this.getContextId(flag, context);

    // Hash determinista basado en el ID
    const hash = this.hashString(contextId + flag.name);
    const userPercentage = (hash % 100) + 1;

    const enabled = userPercentage <= percentage;

    return {
      flagName: flag.name,
      enabled,
      reason: `Porcentaje: ${userPercentage}% <= ${percentage}%`,
      strategy: "percentage",
      timestamp,
    };
  }

  /**
   * Evalúa estrategia de rollout gradual
   */
  private evaluateGradual(
    flag: FeatureFlagConfig,
    context: FeatureFlagContext,
    timestamp: number
  ): FeatureFlagEvaluation {
    const gradual = flag.rolloutConfig?.gradual;

    if (!gradual || !flag.startDate) {
      return {
        flagName: flag.name,
        enabled: false,
        reason: "Gradual sin configuración válida",
        strategy: "gradual",
        timestamp,
      };
    }

    const startTime = flag.startDate.getTime();
    const durationMs = gradual.durationDays * 24 * 60 * 60 * 1000;
    const elapsed = timestamp - startTime;

    if (elapsed < 0) {
      return {
        flagName: flag.name,
        enabled: false,
        reason: "Rollout gradual no iniciado",
        strategy: "gradual",
        timestamp,
      };
    }

    // Calcular porcentaje actual del rollout
    const progress = Math.min(1, elapsed / durationMs);
    const currentPercentage =
      gradual.startPercentage +
      (gradual.targetPercentage - gradual.startPercentage) * progress;

    // Evaluar con el porcentaje actual
    const contextId = this.getContextId(flag, context);
    const hash = this.hashString(contextId + flag.name);
    const userPercentage = (hash % 100) + 1;

    const enabled = userPercentage <= currentPercentage;

    return {
      flagName: flag.name,
      enabled,
      reason: `Gradual: ${currentPercentage.toFixed(1)}% (día ${Math.floor(
        elapsed / (24 * 60 * 60 * 1000)
      )}/${gradual.durationDays})`,
      strategy: "gradual",
      timestamp,
    };
  }

  /**
   * Evalúa estrategia aleatoria
   */
  private evaluateRandom(
    flag: FeatureFlagConfig,
    context: FeatureFlagContext,
    timestamp: number
  ): FeatureFlagEvaluation {
    const seed = flag.rolloutConfig?.randomSeed || 0;
    const contextId = this.getContextId(flag, context);

    // Pseudo-random determinista basado en seed y context
    const hash = this.hashString(contextId + flag.name + seed);
    const enabled = hash % 2 === 0;

    return {
      flagName: flag.name,
      enabled,
      reason: enabled ? "Random: true" : "Random: false",
      strategy: "random",
      timestamp,
    };
  }

  /**
   * Obtiene el ID relevante del contexto según el target del flag
   */
  private getContextId(
    flag: FeatureFlagConfig,
    context: FeatureFlagContext
  ): string {
    switch (flag.target) {
      case "user":
        return context.userId || "unknown";
      case "guild":
        return context.guildId || "unknown";
      case "channel":
        return context.channelId || "unknown";
      case "global":
      default:
        return "global";
    }
  }

  /**
   * Genera un hash simple de un string (para distribución consistente)
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Genera una clave única para el contexto
   */
  private generateContextKey(
    flagName: string,
    context: FeatureFlagContext
  ): string {
    return `${flagName}:${context.userId || "none"}:${
      context.guildId || "none"
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

      // Actualizar caché
      this.flagsCache.set(config.name, config);

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
