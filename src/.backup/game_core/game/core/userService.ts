import { prisma } from '../../core/database/prisma';
import logger from '../../core/lib/logger';

/**
 * Asegura que existan los registros de User y Guild en la base de datos.
 * 
 * **PROBLEMA RESUELTO**: Cuando un usuario nuevo usa comandos de juego (como !inventario, !craftear, etc.),
 * las funciones como getOrCreateWallet(), getOrCreatePlayerStats(), etc. intentaban crear registros
 * con foreign keys a User y Guild que no existían, causando errores de constraint.
 * 
 * **SOLUCIÓN**: Esta función garantiza que User y Guild existan ANTES de crear cualquier dato relacionado.
 * 
 * @param userId - Discord User ID
 * @param guildId - Discord Guild ID
 * @param guildName - Nombre del servidor (opcional, para crear Guild si no existe)
 * @returns Promise<void>
 */
export async function ensureUserAndGuildExist(
  userId: string,
  guildId: string,
  guildName?: string
): Promise<void> {
  try {
    // Verificar y crear User si no existe
    await prisma.user.upsert({
      where: { id: userId },
      update: {}, // No actualizamos nada si ya existe
      create: { id: userId }
    });

    // Verificar y crear Guild si no existe
    await prisma.guild.upsert({
      where: { id: guildId },
      update: {}, // No actualizamos nada si ya existe
      create: {
        id: guildId,
        name: guildName || 'Unknown Server',
        prefix: '!'
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error ensuring User and Guild exist');
    throw error;
  }
}

/**
 * Asegura que un User exista en la base de datos.
 * Útil cuando solo necesitas garantizar que el usuario existe.
 * 
 * @param userId - Discord User ID
 * @returns Promise<void>
 */
export async function ensureUserExists(userId: string): Promise<void> {
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId }
    });
  } catch (error) {
    logger.error({ userId, error }, 'Error ensuring User exists');
    throw error;
  }
}

/**
 * Asegura que un Guild exista en la base de datos.
 * 
 * @param guildId - Discord Guild ID
 * @param guildName - Nombre del servidor (opcional)
 * @returns Promise<void>
 */
export async function ensureGuildExists(guildId: string, guildName?: string): Promise<void> {
  try {
    await prisma.guild.upsert({
      where: { id: guildId },
      update: {},
      create: {
        id: guildId,
        name: guildName || 'Unknown Server',
        prefix: '!'
      }
    });
  } catch (error) {
    logger.error({ guildId, error }, 'Error ensuring Guild exists');
    throw error;
  }
}
