import { createClient } from "redis";
import logger from "../lib/logger";

export const redis = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: process.env.REDIS_URL,
        port: 17965
    }
});

redis.on("error", (err: any) => logger.error({ err }, "Redis error"));
redis.on("connect", () => logger.info("✅ Conectado a Redis"));
redis.on("reconnecting", () => logger.warn("♻️  Reintentando conexión Redis"));

export async function redisConnect () {
    if (!redis.isOpen) await redis.connect();
}
