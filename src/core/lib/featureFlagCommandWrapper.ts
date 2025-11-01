/**
 * Feature Flag Wrapper para Comandos
 * Wrapper universal que funciona tanto para comandos slash como mensajes
 */

import { ChatInputCommandInteraction, Message, MessageFlags } from "discord.js";
import { featureFlagService } from "../services/FeatureFlagService";
import { extractContext } from "../lib/featureFlagHelpers";
import logger from "../lib/logger";
import type Amayo from "../client";

/**
 * Wrapper para proteger comandos con feature flags
 * Funciona tanto para comandos slash como comandos de mensaje
 *
 * @example
 * ```ts
 * export const command: CommandSlash = {
 *   name: 'shop',
 *   run: withFeatureFlag('new_shop_system', async (interaction, client) => {
 *     // Tu código aquí
 *   })
 * };
 *
 * export const command: CommandMessage = {
 *   name: 'shop',
 *   run: withFeatureFlag('new_shop_system', async (message, args, client) => {
 *     // Tu código aquí
 *   })
 * };
 * ```
 */

// Overload para comandos slash
export function withFeatureFlag(
  flagName: string,
  handler: (
    interaction: ChatInputCommandInteraction,
    client: Amayo
  ) => Promise<void>,
  options?: {
    fallbackMessage?: string;
    silent?: boolean;
  }
): (interaction: ChatInputCommandInteraction, client: Amayo) => Promise<void>;

// Overload para comandos de mensaje
export function withFeatureFlag(
  flagName: string,
  handler: (message: Message, args: string[], client: Amayo) => Promise<void>,
  options?: {
    fallbackMessage?: string;
    silent?: boolean;
  }
): (message: Message, args: string[], client: Amayo) => Promise<void>;

// Implementación
export function withFeatureFlag(
  flagName: string,
  handler: any,
  options: {
    fallbackMessage?: string;
    silent?: boolean;
  } = {}
): any {
  return async function (...args: any[]) {
    const firstArg = args[0];

    // Determinar si es comando slash o mensaje
    const isSlashCommand =
      "options" in firstArg && "reply" in firstArg && "user" in firstArg;
    const isMessageCommand = "content" in firstArg && "author" in firstArg;

    if (!isSlashCommand && !isMessageCommand) {
      logger.error("[FeatureFlag] Tipo de comando no soportado");
      return;
    }

    const context = extractContext(firstArg);
    const enabled = await featureFlagService.isEnabled(flagName, context);

    if (!enabled) {
      if (!options.silent) {
        const message =
          options.fallbackMessage ||
          "⚠️ Esta funcionalidad no está disponible en este momento.";

        if (isSlashCommand) {
          const interaction = firstArg as ChatInputCommandInteraction;
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: message,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.reply({
              content: message,
              flags: MessageFlags.Ephemeral,
            });
          }
        } else {
          const msg = firstArg as Message;
          await msg.reply(message);
        }
      }

      logger.debug(`[FeatureFlag] Comando bloqueado por flag "${flagName}"`);
      return;
    }

    // Ejecutar el handler original
    return handler(...args);
  };
}

/**
 * Check rápido para usar dentro de comandos
 * Devuelve true/false sin responder automáticamente
 *
 * @example
 * ```ts
 * run: async (interaction, client) => {
 *   if (!await checkFeatureFlag('new_system', interaction)) {
 *     await interaction.reply('❌ No disponible');
 *     return;
 *   }
 *   // código...
 * }
 * ```
 */
export async function checkFeatureFlag(
  flagName: string,
  source: ChatInputCommandInteraction | Message
): Promise<boolean> {
  const context = extractContext(source);
  return await featureFlagService.isEnabled(flagName, context);
}

/**
 * Guard que responde automáticamente si el flag está disabled
 *
 * @example
 * ```ts
 * run: async (interaction, client) => {
 *   if (!await guardFeatureFlag('new_system', interaction)) {
 *     return; // Ya respondió automáticamente
 *   }
 *   // código...
 * }
 * ```
 */
export async function guardFeatureFlag(
  flagName: string,
  source: ChatInputCommandInteraction | Message,
  customMessage?: string
): Promise<boolean> {
  const context = extractContext(source);
  const enabled = await featureFlagService.isEnabled(flagName, context);

  if (!enabled) {
    const message =
      customMessage ||
      "⚠️ Esta funcionalidad está deshabilitada temporalmente.";

    if ("options" in source && "reply" in source && "user" in source) {
      // Es un comando slash
      const interaction = source as ChatInputCommandInteraction;
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: message,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: message,
          flags: MessageFlags.Ephemeral,
        });
      }
    } else {
      // Es un mensaje
      await source.reply(message);
    }
  }

  return enabled;
}

/**
 * Helper para A/B testing en comandos
 *
 * @example
 * ```ts
 * run: async (interaction, client) => {
 *   await abTestCommand('new_algorithm', interaction, {
 *     variant: async () => {
 *       // Nueva versión
 *       await interaction.reply('Usando algoritmo nuevo');
 *     },
 *     control: async () => {
 *       // Versión antigua
 *       await interaction.reply('Usando algoritmo antiguo');
 *     }
 *   });
 * }
 * ```
 */
export async function abTestCommand<T = void>(
  flagName: string,
  source: ChatInputCommandInteraction | Message,
  variants: {
    variant: () => Promise<T>;
    control: () => Promise<T>;
  }
): Promise<T> {
  const context = extractContext(source);
  const enabled = await featureFlagService.isEnabled(flagName, context);
  return enabled ? variants.variant() : variants.control();
}
