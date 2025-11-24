import { prisma } from "../../database/prisma";
import { redis } from "../../database/redis";
import logger from "../logger";
import { updateUserStats } from "./stats";

/**
 * Vuelca datos de Redis a Prisma.
 */
export async function flushAlliancePoints() {
    try {
        // Scan de claves active_users
        const keys = await redis.keys("alliance:active_users:*");

        for (const key of keys) {
            const guildId = key.split(":")[2];
            const userIds = await redis.sMembers(key);

            if (userIds.length === 0) continue;

            for (const userId of userIds) {
                const pointsKey = `alliance:points:${guildId}:${userId}`;
                const messagesListKey = `alliance:messages:${guildId}:${userId}`;
                const channelMapKey = `alliance:channel_map:${guildId}:${userId}`;

                // Obtener datos
                const pointsStr = await redis.get(pointsKey);
                const points = parseInt(pointsStr || "0");

                if (points > 0) {
                    const messageIds = await redis.lRange(messagesListKey, 0, -1);
                    const channelId = await redis.get(channelMapKey);

                    if (channelId) {
                        // 1. Upsert User & Guild (asegurar existencia)
                        await prisma.user.upsert({
                            where: { id: userId },
                            update: {},
                            create: { id: userId },
                        });
                        await prisma.guild.upsert({
                            where: { id: guildId },
                            update: {},
                            create: { id: guildId, name: "Unknown" },
                        });

                        // 2. Actualizar Stats
                        await updateUserStats(userId, guildId, points);

                        // 3. Crear historial (Batch)
                        const historyData = messageIds.map((msgId) => ({
                            userId,
                            guildId,
                            channelId,
                            messageId: msgId,
                            points: 1, // 1 punto por mensaje
                            timestamp: new Date(), // Aproximado al flush
                        }));

                        if (historyData.length > 0) {
                            await prisma.pointHistory.createMany({
                                data: historyData,
                                skipDuplicates: true,
                            });
                        }
                    }
                }

                // Limpiar claves de este usuario
                await redis.del([pointsKey, messagesListKey, channelMapKey]);
            }

            // Limpiar set de usuarios de este guild
            await redis.del(key);
        }

        if (keys.length > 0) {
            logger.info(`🔄 Flush de puntos de alianza completado para ${keys.length} guilds.`);
        }
    } catch (error) {
        logger.error({ err: error }, "Error en flushAlliancePoints");
    }
}
