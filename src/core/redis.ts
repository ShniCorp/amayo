import { createClient } from "redis";

export const redis = createClient({
    url: process.env.REDIS_URL,
})

redis.on("error", (err: any) => console.error("Redis error:", err));
redis.on("connect", () => console.log("✅ Conectado a Redis"));
redis.on("reconnecting", () => console.warn("♻️  Reintentando conexión Redis"));

export async function redisConnect () {
    if (!redis.isOpen) await redis.connect();
}
