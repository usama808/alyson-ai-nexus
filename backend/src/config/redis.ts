import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

let redis: Redis | null = null;

if (!env.USE_INLINE_JOBS && env.REDIS_URL) {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  });
  redis.on("connect", () => logger.info("Redis connected"));
  redis.on("error", (err: Error) => logger.warn({ err: err.message }, "Redis error"));
}

export function getRedis(): Redis | null {
  return redis;
}

export async function connectRedis(): Promise<void> {
  if (redis) await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redis) await redis.quit();
}
