/**
 * Feature Flag Helpers & Decorators
 * Utilities para usar feature flags fácilmente en comandos
 */

import {
  CommandInteraction,
  Message,
  MessageFlags,
} from "discord.js";
import { featureFlagService } from "../services/FeatureFlagService";
import { FeatureFlagContext } from "../types/featureFlags";
import logger from "./logger";

/**
 * Extrae contexto de un comando o mensaje de Discord
 */
export function extractContext(
  source: CommandInteraction | Message
): FeatureFlagContext {
  const context: FeatureFlagContext = {
    timestamp: Date.now(),
  };

  if (source instanceof CommandInteraction) {
    context.userId = source.user.id;
    context.guildId = source.guildId || undefined;
    context.channelId = source.channelId;
  } else {
    context.userId = source.author.id;
    context.guildId = source.guildId || undefined;
    context.channelId = source.channelId;
  }

  return context;
}

/**
 * Check si un feature flag está habilitado para un contexto
 */
export async function isFeatureEnabled(
  flagName: string,
  context: FeatureFlagContext
): Promise<boolean> {
  try {
    return await featureFlagService.isEnabled(flagName, context);
  } catch (error) {
    logger.error({ err: error }, `[FeatureFlags] Error al verificar "${flagName}"`);
    return false;
  }
}

/**
 * Check si un feature flag está habilitado para un comando/mensaje
 */
export async function isFeatureEnabledForInteraction(
  flagName: string,
  source: CommandInteraction | Message
): Promise<boolean> {
  const context = extractContext(source);
  return isFeatureEnabled(flagName, context);
}

/**
 * Decorador para proteger métodos con feature flags
 *
 * @example
 * ```ts
 * class MyCommand {
 *   @RequireFeature('new_shop_system')
 *   async execute(interaction: CommandInteraction) {
 *     // Este método solo se ejecuta si el flag está habilitado
 *   }
 * }
 * ```
 */
export function RequireFeature(
  flagName: string,
  options: {
    fallbackMessage?: string;
    silent?: boolean;
  } = {}
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Intentar extraer el contexto del primer argumento
      const firstArg = args[0];
      let context: FeatureFlagContext = {};

      if (
        firstArg instanceof CommandInteraction ||
        firstArg instanceof Message
      ) {
        context = extractContext(firstArg);
      }

      const enabled = await isFeatureEnabled(flagName, context);

      if (!enabled) {
        if (!options.silent) {
          const message =
            options.fallbackMessage ||
            "Esta funcionalidad no está disponible en este momento.";

          if (firstArg instanceof CommandInteraction) {
            if (firstArg.replied || firstArg.deferred) {
              await firstArg.followUp({
                content: message,
                flags: MessageFlags.Ephemeral,
              });
            } else {
              await firstArg.reply({
                content: message,
                flags: MessageFlags.Ephemeral,
              });
            }
          } else if (firstArg instanceof Message) {
            await firstArg.reply(message);
          }
        }

        logger.debug(
          `[FeatureFlags] Método ${String(
            propertyKey
          )} bloqueado por flag "${flagName}"`
        );
        return;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Guard para usar en handlers de comandos
 *
 * @example
 * ```ts
 * if (await featureGuard('new_shop', interaction)) {
 *   // Código solo si el flag está habilitado
 * }
 * ```
 */
export async function featureGuard(
  flagName: string,
  source: CommandInteraction | Message,
  options: {
    replyIfDisabled?: boolean;
    customMessage?: string;
  } = { replyIfDisabled: true }
): Promise<boolean> {
  const enabled = await isFeatureEnabledForInteraction(flagName, source);

  if (!enabled && options.replyIfDisabled) {
    const message =
      options.customMessage ||
      "⚠️ Esta funcionalidad está deshabilitada temporalmente.";

    if (source instanceof CommandInteraction) {
      if (source.replied || source.deferred) {
        await source.followUp({
          content: message,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await source.reply({ content: message, flags: MessageFlags.Ephemeral });
      }
    } else {
      await source.reply(message);
    }
  }

  return enabled;
}

/**
 * Wrapper para funciones que requieren feature flags
 *
 * @example
 * ```ts
 * await withFeature('new_mining', context, async () => {
 *   // Este código solo se ejecuta si el flag está habilitado
 *   await doMining();
 * });
 * ```
 */
export async function withFeature<T>(
  flagName: string,
  context: FeatureFlagContext,
  fn: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T | undefined> {
  const enabled = await isFeatureEnabled(flagName, context);

  if (enabled) {
    return fn();
  }

  if (fallback) {
    return fallback();
  }

  return undefined;
}

/**
 * Helper para A/B testing - ejecuta una función u otra según el flag
 *
 * @example
 * ```ts
 * await abTest('new_algorithm', context, {
 *   variant: async () => { /* nueva versión *\/ },
 *   control: async () => { /* versión antigua *\/ }
 * });
 * ```
 */
export async function abTest<T>(
  flagName: string,
  context: FeatureFlagContext,
  variants: {
    variant: () => Promise<T>;
    control: () => Promise<T>;
  }
): Promise<T> {
  const enabled = await isFeatureEnabled(flagName, context);
  return enabled ? variants.variant() : variants.control();
}

/**
 * Helper para ejecutar código solo si múltiples flags están habilitados
 */
export async function requireAllFeatures(
  flagNames: string[],
  context: FeatureFlagContext
): Promise<boolean> {
  const results = await Promise.all(
    flagNames.map((flag) => isFeatureEnabled(flag, context))
  );
  return results.every((enabled) => enabled);
}

/**
 * Helper para ejecutar código si al menos un flag está habilitado
 */
export async function requireAnyFeature(
  flagNames: string[],
  context: FeatureFlagContext
): Promise<boolean> {
  const results = await Promise.all(
    flagNames.map((flag) => isFeatureEnabled(flag, context))
  );
  return results.some((enabled) => enabled);
}
