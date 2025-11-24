import { prisma } from "../../database/prisma";
import { redis } from "../../database/redis";
import logger from "../logger";

/**
 * Buferiza un punto de alianza en Redis.
 */
export async function bufferAlliancePoint(
    guildId: string,
    userId: string,
    channelId: string,
    messageId: string
) {
    // Claves Redis
    const pointsKey = `alliance:points:${guildId}:${userId}`;
    const messagesListKey = `alliance:messages:${guildId}:${userId}`;
    const activeUsersKey = `alliance:active_users:${guildId}`;
    const channelMapKey = `alliance:channel_map:${guildId}:${userId}`;

    // 1. Incrementar puntos en Redis
    await redis.incr(pointsKey);

    // 2. Guardar ID del mensaje (para historial)
    await redis.rPush(messagesListKey, messageId);

    // 3. Marcar usuario como activo para el flush
    await redis.sAdd(activeUsersKey, userId);

    // 4. Guardar referencia del canal
    await redis.set(channelMapKey, channelId);
}

/**
 * Obtiene los puntos buferizados de un usuario.
 */
export async function getBufferedPoints(guildId: string, userId: string): Promise<number> {
    const pointsKey = `alliance:points:${guildId}:${userId}`;
    return parseInt((await redis.get(pointsKey)) || "0");
}

/**
 * Obtiene estadísticas de alianza de un usuario desde la BD.
 */
export async function getUserAllianceStats(userId: string, guildId: string) {
    return prisma.partnershipStats.findFirst({
        where: { userId, guildId },
    });
}

/**
 * Actualiza estadísticas de usuario en la BD.
 */
export async function updateUserStats(
    userId: string,
    guildId: string,
    pointsToAdd: number
) {
    const now = new Date();

    // Obtener o crear las estadísticas del usuario
    let userStats = await prisma.partnershipStats.findFirst({
        where: { userId, guildId },
    });

    if (!userStats) {
        await prisma.partnershipStats.create({
            data: {
                userId,
                guildId,
                totalPoints: pointsToAdd,
                weeklyPoints: pointsToAdd,
                monthlyPoints: pointsToAdd,
                lastWeeklyReset: now,
                lastMonthlyReset: now,
            },
        });
        return;
    }

    // Verificar si necesita reset semanal (7 días)
    const weeksPassed = Math.floor(
        (now.getTime() - userStats.lastWeeklyReset.getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    );
    const needsWeeklyReset = weeksPassed >= 1;

    // Verificar si necesita reset mensual (30 días)
    const daysPassed = Math.floor(
        (now.getTime() - userStats.lastMonthlyReset.getTime()) /
        (24 * 60 * 60 * 1000)
    );
    const needsMonthlyReset = daysPassed >= 30;

    // Actualizar estadísticas
    await prisma.partnershipStats.update({
        where: {
            userId_guildId: { userId, guildId },
        },
        data: {
            totalPoints: { increment: pointsToAdd },
            weeklyPoints: needsWeeklyReset ? pointsToAdd : { increment: pointsToAdd },
            monthlyPoints: needsMonthlyReset ? pointsToAdd : { increment: pointsToAdd },
            lastWeeklyReset: needsWeeklyReset ? now : userStats.lastWeeklyReset,
            lastMonthlyReset: needsMonthlyReset ? now : userStats.lastMonthlyReset,
        },
    });
}
