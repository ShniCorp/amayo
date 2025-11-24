/**
 * Ejemplos de uso de Feature Flags en comandos
 * Funciona para comandos slash Y comandos de mensaje
 */

import { ChatInputCommandInteraction, Message } from "discord.js";
import { CommandSlash, CommandMessage } from "../../src/core/types/commands";
import {
  withFeatureFlag,
  checkFeatureFlag,
  guardFeatureFlag,
  abTestCommand,
} from "../../src/core/lib/featureFlagCommandWrapper";
import type Amayo from "../../src/core/client";

// ============================================================================
// PATRÓN 1: Usando withFeatureFlag (wrapper) - RECOMENDADO
// ============================================================================

/**
 * Comando Slash con Feature Flag
 * El wrapper bloquea automáticamente si el flag está disabled
 */
export const shopSlashCommand: CommandSlash = {
  name: "shop",
  description: "Abre la tienda",
  type: "slash",
  cooldown: 10,
  // Envuelve el handler con el wrapper
  run: withFeatureFlag(
    "new_shop_system",
    async (interaction: ChatInputCommandInteraction, client: Amayo) => {
      // Este código solo se ejecuta si el flag está enabled
      await interaction.reply("🛒 Bienvenido a la tienda!");
    },
    {
      fallbackMessage: "🔧 La tienda está en mantenimiento.",
    }
  ),
};

/**
 * Comando de Mensaje con Feature Flag
 * El mismo wrapper funciona para comandos de mensaje
 */
export const shopMessageCommand: CommandMessage = {
  name: "shop",
  type: "message",
  cooldown: 10,
  description: "Abre la tienda",
  // El mismo wrapper funciona aquí
  run: withFeatureFlag(
    "new_shop_system",
    async (message: Message, args: string[], client: Amayo) => {
      // Este código solo se ejecuta si el flag está enabled
      await message.reply("🛒 Bienvenido a la tienda!");
    },
    {
      fallbackMessage: "🔧 La tienda está en mantenimiento.",
    }
  ),
};

// ============================================================================
// PATRÓN 2: Usando guardFeatureFlag (check con respuesta automática)
// ============================================================================

/**
 * Comando Slash con guard
 */
export const mineSlashCommand: CommandSlash = {
  name: "mine",
  description: "Minea recursos",
  type: "slash",
  cooldown: 10,
  run: async (interaction, client) => {
    // Guard que responde automáticamente si está disabled
    if (!(await guardFeatureFlag("new_mining_system", interaction))) {
      return; // Ya respondió automáticamente
    }

    // Código del comando
    await interaction.reply("⛏️ Minando...");
  },
};

/**
 * Comando de Mensaje con guard
 */
export const mineMessageCommand: CommandMessage = {
  name: "mine",
  type: "message",
  cooldown: 10,
  run: async (message, args, client) => {
    // El mismo guard funciona para mensajes
    if (!(await guardFeatureFlag("new_mining_system", message))) {
      return;
    }

    await message.reply("⛏️ Minando...");
  },
};

// ============================================================================
// PATRÓN 3: Usando checkFeatureFlag (check manual)
// ============================================================================

/**
 * Comando Slash con check manual
 * Útil cuando necesitas lógica custom
 */
export const inventorySlashCommand: CommandSlash = {
  name: "inventory",
  description: "Muestra tu inventario",
  type: "slash",
  cooldown: 5,
  run: async (interaction, client) => {
    const useNewUI = await checkFeatureFlag("inventory_ui_v2", interaction);

    if (useNewUI) {
      // Nueva UI
      await interaction.reply({
        content: "📦 **Inventario v2**\n- Item 1\n- Item 2",
      });
    } else {
      // UI antigua
      await interaction.reply({
        content: "📦 Inventario: Item 1, Item 2",
      });
    }
  },
};

/**
 * Comando de Mensaje con check manual
 */
export const inventoryMessageCommand: CommandMessage = {
  name: "inventory",
  type: "message",
  cooldown: 5,
  aliases: ["inv", "items"],
  run: async (message, args, client) => {
    const useNewUI = await checkFeatureFlag("inventory_ui_v2", message);

    if (useNewUI) {
      await message.reply("📦 **Inventario v2**\n- Item 1\n- Item 2");
    } else {
      await message.reply("📦 Inventario: Item 1, Item 2");
    }
  },
};

// ============================================================================
// PATRÓN 4: A/B Testing
// ============================================================================

/**
 * Comando Slash con A/B testing
 */
export const combatSlashCommand: CommandSlash = {
  name: "attack",
  description: "Ataca a un enemigo",
  type: "slash",
  cooldown: 10,
  run: async (interaction, client) => {
    await abTestCommand("improved_combat_algorithm", interaction, {
      variant: async () => {
        // 50% de usuarios ven el nuevo algoritmo
        const damage = Math.floor(Math.random() * 100) + 50;
        await interaction.reply(`⚔️ Daño (nuevo): ${damage}`);
      },
      control: async () => {
        // 50% ven el algoritmo antiguo
        const damage = Math.floor(Math.random() * 50) + 25;
        await interaction.reply(`⚔️ Daño (antiguo): ${damage}`);
      },
    });
  },
};

/**
 * Comando de Mensaje con A/B testing
 */
export const combatMessageCommand: CommandMessage = {
  name: "attack",
  type: "message",
  cooldown: 10,
  run: async (message, args, client) => {
    await abTestCommand("improved_combat_algorithm", message, {
      variant: async () => {
        const damage = Math.floor(Math.random() * 100) + 50;
        await message.reply(`⚔️ Daño (nuevo): ${damage}`);
      },
      control: async () => {
        const damage = Math.floor(Math.random() * 50) + 25;
        await message.reply(`⚔️ Daño (antiguo): ${damage}`);
      },
    });
  },
};

// ============================================================================
// PATRÓN 5: Múltiples flags (migrando sistema antiguo a nuevo)
// ============================================================================

/**
 * Comando que migra gradualmente de un sistema a otro
 */
export const economySlashCommand: CommandSlash = {
  name: "balance",
  description: "Muestra tu balance",
  type: "slash",
  cooldown: 5,
  run: async (interaction, client) => {
    const useNewEconomy = await checkFeatureFlag(
      "economy_system_v2",
      interaction
    );
    const usePremiumFeatures = await checkFeatureFlag(
      "premium_features",
      interaction
    );

    if (useNewEconomy) {
      // Sistema nuevo de economía
      const balance = 5000;
      const streak = usePremiumFeatures ? "🔥 Racha: 7 días" : "";

      await interaction.reply(
        `💰 Balance: ${balance} monedas\n${streak}`.trim()
      );
    } else {
      // Sistema antiguo
      const balance = 5000;
      await interaction.reply(`💰 Tienes ${balance} monedas`);
    }
  },
};

/**
 * Lo mismo pero para comando de mensaje
 */
export const economyMessageCommand: CommandMessage = {
  name: "balance",
  type: "message",
  cooldown: 5,
  aliases: ["bal", "money"],
  run: async (message, args, client) => {
    const useNewEconomy = await checkFeatureFlag("economy_system_v2", message);
    const usePremiumFeatures = await checkFeatureFlag(
      "premium_features",
      message
    );

    if (useNewEconomy) {
      const balance = 5000;
      const streak = usePremiumFeatures ? "🔥 Racha: 7 días" : "";
      await message.reply(`💰 Balance: ${balance} monedas\n${streak}`.trim());
    } else {
      const balance = 5000;
      await message.reply(`💰 Tienes ${balance} monedas`);
    }
  },
};

// ============================================================================
// PATRÓN 6: Comando universal (un solo run para ambos)
// ============================================================================

/**
 * Helper para detectar tipo de comando
 */
function isSlashCommand(
  source: ChatInputCommandInteraction | Message
): source is ChatInputCommandInteraction {
  return "options" in source && "user" in source;
}

/**
 * Función de negocio universal
 */
async function showProfile(
  source: ChatInputCommandInteraction | Message,
  userId: string
) {
  const useNewProfile = await checkFeatureFlag("profile_v2", source);

  const profileText = useNewProfile
    ? `👤 **Perfil v2**\nUsuario: <@${userId}>\nNivel: 10`
    : `👤 Perfil: <@${userId}> - Nivel 10`;

  if (isSlashCommand(source)) {
    await source.reply(profileText);
  } else {
    await source.reply(profileText);
  }
}

/**
 * Comando Slash que usa la función universal
 */
export const profileSlashCommand: CommandSlash = {
  name: "profile",
  description: "Muestra tu perfil",
  type: "slash",
  cooldown: 5,
  run: async (interaction, client) => {
    await showProfile(interaction, interaction.user.id);
  },
};

/**
 * Comando de Mensaje que usa la misma función universal
 */
export const profileMessageCommand: CommandMessage = {
  name: "profile",
  type: "message",
  cooldown: 5,
  aliases: ["perfil", "me"],
  run: async (message, args, client) => {
    await showProfile(message, message.author.id);
  },
};

// ============================================================================
// RESUMEN DE PATRONES
// ============================================================================

/*
 * PATRÓN 1: withFeatureFlag()
 * - Más limpio y declarativo
 * - Bloquea automáticamente si disabled
 * - Recomendado para comandos simples
 *
 * PATRÓN 2: guardFeatureFlag()
 * - Check con respuesta automática
 * - Control total del flujo
 * - Bueno para lógica compleja
 *
 * PATRÓN 3: checkFeatureFlag()
 * - Check manual sin respuesta
 * - Para if/else personalizados
 * - Migración gradual de sistemas
 *
 * PATRÓN 4: abTestCommand()
 * - A/B testing directo
 * - Ejecuta función u otra según flag
 * - Ideal para comparar versiones
 *
 * PATRÓN 5: Múltiples flags
 * - Combina varios checks
 * - Features progresivas
 * - Sistemas modulares
 *
 * PATRÓN 6: Función universal
 * - Un solo código para ambos tipos
 * - Reutilización máxima
 * - Mantenimiento simplificado
 */
