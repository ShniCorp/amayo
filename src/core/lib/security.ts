/**
 * Sistema de permisos y seguridad para comandos administrativos
 *
 * Proporciona funciones para restringir comandos a:
 * - Guild de testing (process.env.guildTest)
 * - Usuarios específicos (whitelist)
 * - Roles específicos
 */

import {
  CommandInteraction,
  Message,
  GuildMember,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import logger from "../lib/logger";

/**
 * Verifica si la interacción/mensaje viene del guild de testing
 */
export function isTestGuild(source: CommandInteraction | Message): boolean {
  const guildId =
    source.guildId || (source instanceof Message ? source.guild?.id : null);
  const testGuildId = process.env.guildTest;

  if (!testGuildId) {
    logger.warn("[Security] guildTest no configurado en .env");
    return false;
  }

  return guildId === testGuildId;
}

/**
 * Guard que solo permite ejecución en guild de testing
 * Responde automáticamente si no es el guild correcto
 */
export async function requireTestGuild(
  source: CommandInteraction | Message
): Promise<boolean> {
  if (isTestGuild(source)) {
    return true;
  }

  const errorMsg =
    "🔒 Este comando solo está disponible en el servidor de testing.";

  if (source instanceof Message) {
    await source.reply(errorMsg);
  } else {
    if (source.deferred || source.replied) {
      await source.followUp({
        content: errorMsg,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await source.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
    }
  }

  logger.warn({
    msg: "[Security] Comando bloqueado - no es guild de testing",
    guildId: source.guildId,
    userId: source instanceof Message ? source.author.id : source.user.id,
  });

  return false;
}

/**
 * Verifica si el usuario es administrador del servidor
 */
export function isGuildAdmin(member: GuildMember | null): boolean {
  if (!member) return false;
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

/**
 * Verifica si el usuario es dueño del bot (por ID en .env)
 */
export function isBotOwner(userId: string): boolean {
  const ownerId = process.env.OWNER_ID || process.env.BOT_OWNER_ID;
  return ownerId === userId;
}

/**
 * Guard combinado: requiere guild de testing Y ser admin
 */
export async function requireTestGuildAndAdmin(
  source: CommandInteraction | Message
): Promise<boolean> {
  // Primero verificar guild
  if (!isTestGuild(source)) {
    const errorMsg =
      "🔒 Este comando solo está disponible en el servidor de testing.";

    if (source instanceof Message) {
      await source.reply(errorMsg);
    } else {
      if (source.deferred || source.replied) {
        await source.followUp({
          content: errorMsg,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await source.reply({
          content: errorMsg,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    return false;
  }

  // Luego verificar permisos
  const member = source.member as GuildMember | null;
  const userId = source instanceof Message ? source.author.id : source.user.id;

  if (isBotOwner(userId) || isGuildAdmin(member)) {
    return true;
  }

  const errorMsg = "🔒 Este comando requiere permisos de administrador.";

  if (source instanceof Message) {
    await source.reply(errorMsg);
  } else {
    if (source.deferred || source.replied) {
      await source.followUp({
        content: errorMsg,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await source.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
    }
  }

  logger.warn({
    msg: "[Security] Comando bloqueado - sin permisos de admin",
    guildId: source.guildId,
    userId,
  });

  return false;
}

/**
 * Whitelist de usuarios autorizados (IDs)
 * Puede usarse para comandos ultra-sensibles
 */
const AUTHORIZED_USERS = new Set<string>(
  process.env.AUTHORIZED_USER_IDS?.split(",").map((id) => id.trim()) || []
);

/**
 * Verifica si el usuario está en la whitelist de autorizados
 */
export function isAuthorizedUser(userId: string): boolean {
  return isBotOwner(userId) || AUTHORIZED_USERS.has(userId);
}

/**
 * Guard para comandos que requieren autorización explícita
 */
export async function requireAuthorizedUser(
  source: CommandInteraction | Message
): Promise<boolean> {
  const userId = source instanceof Message ? source.author.id : source.user.id;

  if (isAuthorizedUser(userId)) {
    return true;
  }

  const errorMsg = "🔒 No tienes autorización para usar este comando.";

  if (source instanceof Message) {
    await source.reply(errorMsg);
  } else {
    if (source.deferred || source.replied) {
      await source.followUp({
        content: errorMsg,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await source.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
    }
  }

  logger.warn({
    msg: "[Security] Comando bloqueado - usuario no autorizado",
    userId,
    guildId: source.guildId,
  });

  return false;
}

/**
 * Wrapper para comandos que requieren test guild
 * Uso: export const command = withTestGuild({ name, run: async (...) => { ... } })
 */
export function withTestGuild<T extends { run: Function }>(command: T): T {
  const originalRun = command.run;

  return {
    ...command,
    run: async (source: any, ...args: any[]) => {
      if (!(await requireTestGuild(source))) {
        return;
      }
      return originalRun(source, ...args);
    },
  } as T;
}

/**
 * Wrapper para comandos que requieren test guild + admin
 */
export function withTestGuildAndAdmin<T extends { run: Function }>(
  command: T
): T {
  const originalRun = command.run;

  return {
    ...command,
    run: async (source: any, ...args: any[]) => {
      if (!(await requireTestGuildAndAdmin(source))) {
        return;
      }
      return originalRun(source, ...args);
    },
  } as T;
}
