import Redis from "ioredis";
import { redisConfig } from "../config/redis.config";
import { logger } from "../logger/logger";

export const redis = new Redis(redisConfig.url, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

redis.on("error", (error) => {
  logger.error("Redis error", error);
});

export async function connectRedis(): Promise<void> {
  if (redis.status === "connecting" || redis.status === "ready") {
    return;
  }

  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redis.status === "end" || redis.status === "wait") {
    return;
  }

  await redis.quit();
}
