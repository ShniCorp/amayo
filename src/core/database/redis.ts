import { createClient } from "redis";

export const redis = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: process.env.REDIS_URL,
        port: 17965
    }
});

redis.on("error", (err: any) => console.error("Redis error:", err));
redis.on("connect", () => console.log("✅ Conectado a Redis"));
redis.on("reconnecting", () => console.warn("♻️  Reintentando conexión Redis"));

export async function redisConnect () {
    if (!redis.isOpen) await redis.connect();
}
