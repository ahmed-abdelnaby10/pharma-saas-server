import { ConnectionOptions } from "bullmq";
import { env } from "../config/env";

/**
 * BullMQ uses its own dedicated Redis connections (separate from the
 * shared ioredis client). Pass the same URL — BullMQ manages the lifecycle.
 */
export const bullmqConnection: ConnectionOptions = {
  url: env.REDIS_URL,
};
