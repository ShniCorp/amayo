import {
    FeatureFlagConfig,
    FeatureFlagContext,
    FeatureFlagEvaluation,
} from "../types/featureFlags";

/**
 * Feature Flag Evaluator
 * Pure logic class for evaluating feature flags based on context and configuration.
 * Separated from Service to allow easier testing and separation of concerns.
 */
export class FeatureFlagEvaluator {
    /**
     * Evalúa un flag según su configuración
     */
    public evaluate(
        flag: FeatureFlagConfig,
        context: FeatureFlagContext
    ): FeatureFlagEvaluation {
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
}

export const featureFlagEvaluator = new FeatureFlagEvaluator();
