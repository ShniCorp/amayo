/**
 * Feature Flags Types
 * Sistema de control de features para rollouts progresivos, A/B testing y toggles
 */

export type FeatureFlagStatus =
  | "enabled"
  | "disabled"
  | "rollout"
  | "maintenance";

export type FeatureFlagTarget = "global" | "guild" | "user" | "channel";

export type RolloutStrategy =
  | "percentage" // Basado en % de usuarios
  | "whitelist" // Lista específica de IDs
  | "blacklist" // Todos excepto lista
  | "gradual" // Rollout gradual basado en tiempo
  | "random"; // Aleatorio por sesión

export interface FeatureFlagConfig {
  /** Nombre único del flag */
  name: string;

  /** Descripción del flag */
  description?: string;

  /** Estado del flag */
  status: FeatureFlagStatus;

  /** Nivel de aplicación del flag */
  target: FeatureFlagTarget;

  /** Estrategia de rollout (si status es 'rollout') */
  rolloutStrategy?: RolloutStrategy;

  /** Configuración específica de la estrategia */
  rolloutConfig?: RolloutConfig;

  /** Fecha de inicio del flag */
  startDate?: Date;

  /** Fecha de fin del flag (auto-deshabilitar) */
  endDate?: Date;

  /** Metadata adicional */
  metadata?: Record<string, any>;

  /** Timestamp de creación */
  createdAt?: Date;

  /** Timestamp de última actualización */
  updatedAt?: Date;
}

export interface RolloutConfig {
  /** Porcentaje de usuarios (0-100) para estrategia 'percentage' */
  percentage?: number;

  /** Lista de IDs (guild/user/channel) para whitelist/blacklist */
  targetIds?: string[];

  /** Configuración de rollout gradual */
  gradual?: {
    /** Porcentaje inicial */
    startPercentage: number;
    /** Porcentaje objetivo */
    targetPercentage: number;
    /** Duración del rollout en días */
    durationDays: number;
  };

  /** Seed para aleatorización consistente */
  randomSeed?: number;
}

export interface FeatureFlagContext {
  /** ID del usuario */
  userId?: string;

  /** ID del guild */
  guildId?: string;

  /** ID del canal */
  channelId?: string;

  /** Timestamp de la evaluación */
  timestamp?: number;

  /** Metadata adicional del contexto */
  metadata?: Record<string, any>;
}

export interface FeatureFlagEvaluation {
  /** Nombre del flag evaluado */
  flagName: string;

  /** Resultado de la evaluación */
  enabled: boolean;

  /** Razón de la decisión */
  reason: string;

  /** Estrategia aplicada */
  strategy?: RolloutStrategy;

  /** Timestamp de evaluación */
  timestamp: number;
}

export interface FeatureFlagStats {
  /** Nombre del flag */
  flagName: string;

  /** Total de evaluaciones */
  totalEvaluations: number;

  /** Evaluaciones positivas (enabled) */
  enabledCount: number;

  /** Evaluaciones negativas (disabled) */
  disabledCount: number;

  /** Tasa de activación (%) */
  enablementRate: number;

  /** Última evaluación */
  lastEvaluation?: Date;
}

/** Decorador para proteger comandos con feature flags */
export interface FeatureFlagDecorator {
  (
    flagName: string,
    options?: {
      fallbackMessage?: string;
      silent?: boolean;
      checkUser?: boolean;
      checkGuild?: boolean;
    }
  ): MethodDecorator;
}
