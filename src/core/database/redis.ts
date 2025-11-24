import { createClient } from "redis";
import logger from "../lib/logger";

export const redis = createClient({
  url: process.env.REDIS_URL_VPS,
});

redis.on("error", (err: any) => logger.error({ err }, "Redis error"));
redis.on("connect", () => logger.info("✅ Conectado a Redis"));
redis.on("reconnecting", () => logger.warn("♻️  Reintentando conexión Redis"));

export async function redisConnect() {
  if (!redis.isOpen) await redis.connect();
}
