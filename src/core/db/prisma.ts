import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { createPrismaPgAdapter } from "./pg-adapter";

const adapter = createPrismaPgAdapter({
  connectionString: env.DATABASE_URL,
  poolMax: env.DATABASE_POOL_MAX,
  idleTimeoutMillis: env.DATABASE_POOL_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DATABASE_POOL_CONNECTION_TIMEOUT_MS,
});

export const prisma = new PrismaClient({
  adapter,
});

export async function connectPrisma(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
