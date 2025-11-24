/**
 * Feature Flags Types
 * Sistema de control de features para rollouts progresivos, A/B testing y toggles
 */

import { z } from "zod";

// --- Enums & Literals ---

export const FeatureFlagStatusSchema = z.enum([
  "enabled",
  "disabled",
  "rollout",
  "maintenance",
]);

export const FeatureFlagTargetSchema = z.enum([
  "global",
  "guild",
  "user",
  "channel",
]);

export const RolloutStrategySchema = z.enum([
  "percentage", // Basado en % de usuarios
  "whitelist", // Lista específica de IDs
  "blacklist", // Todos excepto lista
  "gradual", // Rollout gradual basado en tiempo
  "random", // Aleatorio por sesión
]);

// --- Schemas ---

export const RolloutConfigSchema = z.object({
  /** Porcentaje de usuarios (0-100) para estrategia 'percentage' */
  percentage: z.number().min(0).max(100).optional(),

  /** Lista de IDs (guild/user/channel) para whitelist/blacklist */
  targetIds: z.array(z.string()).optional(),

  /** Configuración de rollout gradual */
  gradual: z
    .object({
      /** Porcentaje inicial */
      startPercentage: z.number().min(0).max(100),
      /** Porcentaje objetivo */
      targetPercentage: z.number().min(0).max(100),
      /** Duración del rollout en días */
      durationDays: z.number().min(1),
    })
    .optional(),

  /** Seed para aleatorización consistente */
  randomSeed: z.number().optional(),
});

export const FeatureFlagConfigSchema = z.object({
  /** Nombre único del flag */
  name: z.string(),

  /** Descripción del flag */
  description: z.string().optional(),

  /** Estado del flag */
  status: FeatureFlagStatusSchema,

  /** Nivel de aplicación del flag */
  target: FeatureFlagTargetSchema,

  /** Estrategia de rollout (si status es 'rollout') */
  rolloutStrategy: RolloutStrategySchema.optional(),

  /** Configuración específica de la estrategia */
  rolloutConfig: RolloutConfigSchema.optional(),

  /** Fecha de inicio del flag */
  startDate: z.date().optional(),

  /** Fecha de fin del flag (auto-deshabilitar) */
  endDate: z.date().optional(),

  /** Metadata adicional */
  metadata: z.record(z.any()).optional(),

  /** Timestamp de creación */
  createdAt: z.date().optional(),

  /** Timestamp de última actualización */
  updatedAt: z.date().optional(),
});

export const FeatureFlagContextSchema = z.object({
  /** ID del usuario */
  userId: z.string().optional(),

  /** ID del guild */
  guildId: z.string().optional(),

  /** ID del canal */
  channelId: z.string().optional(),

  /** Timestamp de la evaluación */
  timestamp: z.number().optional(),

  /** Metadata adicional del contexto */
  metadata: z.record(z.any()).optional(),
});

// --- Types Inferred from Zod ---

export type FeatureFlagStatus = z.infer<typeof FeatureFlagStatusSchema>;
export type FeatureFlagTarget = z.infer<typeof FeatureFlagTargetSchema>;
export type RolloutStrategy = z.infer<typeof RolloutStrategySchema>;
export type RolloutConfig = z.infer<typeof RolloutConfigSchema>;
export type FeatureFlagConfig = z.infer<typeof FeatureFlagConfigSchema>;
export type FeatureFlagContext = z.infer<typeof FeatureFlagContextSchema>;

// --- Other Interfaces (Not Zod validated at runtime usually, but kept for types) ---

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
