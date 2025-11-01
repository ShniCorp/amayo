/**
 * Ejemplo de Uso de Feature Flags en Comandos
 *
 * Este archivo muestra varios patrones de uso del sistema de feature flags
 */

import { CommandInteraction, Message } from "discord.js";
import {
  RequireFeature,
  featureGuard,
  isFeatureEnabledForInteraction,
  abTest,
  extractContext,
  requireAllFeatures,
} from "../core/lib/featureFlagHelpers";

// ============================================================================
// Ejemplo 1: Usar decorador @RequireFeature
// ============================================================================
export class ShopCommand {
  /**
   * El decorador RequireFeature bloquea automáticamente la ejecución
   * si el flag no está habilitado y responde al usuario
   */
  @RequireFeature("new_shop_system", {
    fallbackMessage: "🔧 El nuevo sistema de tienda estará disponible pronto.",
  })
  async execute(interaction: CommandInteraction) {
    // Este código solo se ejecuta si el flag está habilitado
    await interaction.reply("¡Bienvenido a la nueva tienda!");
  }
}

// ============================================================================
// Ejemplo 2: Usar featureGuard (más control)
// ============================================================================
export async function handleMiningCommand(interaction: CommandInteraction) {
  // featureGuard devuelve true/false y opcionalmente responde al usuario
  if (
    !(await featureGuard("new_mining_system", interaction, {
      replyIfDisabled: true,
      customMessage: "⛏️ El nuevo sistema de minería está en mantenimiento.",
    }))
  ) {
    return; // Sale si el flag está deshabilitado
  }

  // Código del nuevo sistema de minería
  await interaction.reply("⛏️ Iniciando minería con el nuevo sistema...");
}

// ============================================================================
// Ejemplo 3: Check manual (para lógica condicional)
// ============================================================================
export async function handleInventoryCommand(interaction: CommandInteraction) {
  const useNewUI = await isFeatureEnabledForInteraction(
    "inventory_ui_v2",
    interaction
  );

  if (useNewUI) {
    // Muestra el inventario con la nueva UI
    await showInventoryV2(interaction);
  } else {
    // Muestra el inventario con la UI antigua
    await showInventoryV1(interaction);
  }
}

async function showInventoryV2(interaction: CommandInteraction) {
  await interaction.reply("📦 Inventario (UI v2)");
}

async function showInventoryV1(interaction: CommandInteraction) {
  await interaction.reply("📦 Inventario (UI v1)");
}

// ============================================================================
// Ejemplo 4: A/B Testing
// ============================================================================
export async function handleCombatCommand(interaction: CommandInteraction) {
  const context = extractContext(interaction);

  // A/B testing: mitad de usuarios usa el algoritmo nuevo, mitad el viejo
  const result = await abTest("improved_combat_algorithm", context, {
    variant: async () => {
      // Nueva versión del algoritmo
      return calculateDamageV2();
    },
    control: async () => {
      // Versión antigua del algoritmo
      return calculateDamageV1();
    },
  });

  await interaction.reply(`⚔️ Daño calculado: ${result}`);
}

function calculateDamageV2(): number {
  // Lógica nueva
  return Math.floor(Math.random() * 100) + 50;
}

function calculateDamageV1(): number {
  // Lógica antigua
  return Math.floor(Math.random() * 50) + 25;
}

// ============================================================================
// Ejemplo 5: Múltiples flags (acceso premium)
// ============================================================================
export async function handlePremiumFeature(interaction: CommandInteraction) {
  const context = extractContext(interaction);

  // Requiere que TODOS los flags estén habilitados
  const hasAccess = await requireAllFeatures(
    ["premium_features", "beta_access", "advanced_commands"],
    context
  );

  if (!hasAccess) {
    await interaction.reply({
      content: "❌ No tienes acceso a esta funcionalidad premium.",
      flags: ["Ephemeral"],
    });
    return;
  }

  await interaction.reply("✨ Funcionalidad premium activada!");
}

// ============================================================================
// Ejemplo 6: Migrando de sistema antiguo a nuevo gradualmente
// ============================================================================
export async function handleEconomyCommand(interaction: CommandInteraction) {
  const useNewSystem = await isFeatureEnabledForInteraction(
    "economy_system_v2",
    interaction
  );

  if (useNewSystem) {
    // Nuevo sistema de economía
    await newEconomySystem.processTransaction(interaction);
  } else {
    // Sistema antiguo (mantener por compatibilidad durante el rollout)
    await oldEconomySystem.processTransaction(interaction);
  }
}

// Simulación de sistemas
const newEconomySystem = {
  async processTransaction(interaction: CommandInteraction) {
    await interaction.reply("💰 Transacción procesada (Sistema v2)");
  },
};

const oldEconomySystem = {
  async processTransaction(interaction: CommandInteraction) {
    await interaction.reply("💰 Transacción procesada (Sistema v1)");
  },
};

// ============================================================================
// Ejemplo 7: Eventos temporales con fechas
// ============================================================================
export async function handleHalloweenEvent(interaction: CommandInteraction) {
  // El flag 'halloween_2025' tiene startDate y endDate configurados
  // Se habilitará automáticamente durante el período del evento
  if (
    !(await featureGuard("halloween_2025", interaction, {
      replyIfDisabled: true,
      customMessage:
        "🎃 El evento de Halloween no está activo en este momento.",
    }))
  ) {
    return;
  }

  await interaction.reply("🎃 ¡Bienvenido al evento de Halloween 2025!");
}

// ============================================================================
// Ejemplo 8: Kill Switch para emergencias
// ============================================================================
export async function handleProblematicFeature(
  interaction: CommandInteraction
) {
  // Si hay un bug crítico, el administrador puede cambiar el flag a 'maintenance'
  // inmediatamente sin necesidad de redeploy
  if (
    !(await featureGuard("experimental_feature", interaction, {
      replyIfDisabled: true,
      customMessage:
        "🔧 Esta funcionalidad está en mantenimiento temporalmente.",
    }))
  ) {
    return;
  }

  // Código que podría tener bugs
  await experimentalLogic(interaction);
}

async function experimentalLogic(interaction: CommandInteraction) {
  await interaction.reply("🧪 Funcionalidad experimental activada");
}

// ============================================================================
// Ejemplo 9: Beta Testing por Guild (servidor)
// ============================================================================
export async function handleBetaCommand(interaction: CommandInteraction) {
  // El flag 'beta_features' está configurado con:
  // - target: 'guild'
  // - rolloutStrategy: 'whitelist'
  // - rolloutConfig: { targetIds: ['guild_id_1', 'guild_id_2'] }

  const context = extractContext(interaction);

  if (
    !(await featureGuard("beta_features", interaction, {
      replyIfDisabled: true,
      customMessage:
        "🔒 Tu servidor no tiene acceso a las funcionalidades beta.",
    }))
  ) {
    return;
  }

  await interaction.reply(
    "🧪 Funcionalidades beta activadas para este servidor!"
  );
}

// ============================================================================
// Ejemplo 10: Rollout progresivo por porcentaje
// ============================================================================
export async function handleNewGameMode(interaction: CommandInteraction) {
  // El flag 'new_game_mode' está configurado con:
  // - status: 'rollout'
  // - rolloutStrategy: 'percentage'
  // - rolloutConfig: { percentage: 25 }
  //
  // Esto significa que el 25% de usuarios verán el nuevo modo de juego
  // de forma determinista (el mismo usuario siempre verá lo mismo)

  if (!(await featureGuard("new_game_mode", interaction))) {
    return;
  }

  await interaction.reply("🎮 ¡Nuevo modo de juego desbloqueado!");
}

// ============================================================================
// Ejemplo 11: Usando en Message Commands (comandos de texto)
// ============================================================================
export async function handleTextCommand(message: Message, args: string[]) {
  // También funciona con comandos de texto tradicionales
  const context = extractContext(message);

  const useNewParser = await isFeatureEnabledForInteraction(
    "new_command_parser",
    message
  );

  if (useNewParser) {
    await parseCommandV2(message, args);
  } else {
    await parseCommandV1(message, args);
  }
}

async function parseCommandV2(message: Message, args: string[]) {
  await message.reply("Comando parseado con parser v2");
}

async function parseCommandV1(message: Message, args: string[]) {
  await message.reply("Comando parseado con parser v1");
}

// ============================================================================
// RESUMEN DE PATRONES
// ============================================================================
/*
 * 1. @RequireFeature - Para bloquear métodos enteros fácilmente
 * 2. featureGuard - Para checks con respuesta automática al usuario
 * 3. isFeatureEnabled - Para lógica condicional if/else
 * 4. abTest - Para A/B testing
 * 5. requireAllFeatures - Para requerir múltiples flags (AND)
 * 6. requireAnyFeature - Para requerir al menos uno (OR)
 * 7. withFeature - Para ejecutar código con fallback opcional
 *
 * Configuración de flags vía comando:
 * /featureflags create name:flag_name status:disabled target:global
 * /featureflags update flag:flag_name status:enabled
 * /featureflags rollout flag:flag_name strategy:percentage percentage:25
 */
