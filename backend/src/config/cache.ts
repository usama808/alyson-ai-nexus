import { getRedis } from "./redis.js";
import { env } from "./env.js";

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

export async function cacheGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (redis) return redis.get(key);

  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds = 300): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.setex(key, ttlSeconds, value);
    return;
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.del(key);
    return;
  }
  memoryCache.delete(key);
}

export function cacheEnabled(): boolean {
  return env.USE_INLINE_JOBS || !!getRedis();
}
