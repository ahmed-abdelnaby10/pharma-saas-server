import { redis } from "./redis";

/**
 * Thin wrapper around ioredis that keeps Redis access centralised.
 * All callers should use this service rather than importing `redis` directly.
 */
export const cacheService = {
  async get(key: string): Promise<string | null> {
    return redis.get(key);
  },

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await redis.set(key, value, "EX", ttlSeconds);
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  async exists(key: string): Promise<boolean> {
    const count = await redis.exists(key);
    return count > 0;
  },
};
