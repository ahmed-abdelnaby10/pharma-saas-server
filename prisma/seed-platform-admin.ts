/// <reference types="node" />
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { createPrismaPgAdapter } from "../src/core/db/pg-adapter";

dotenv.config();

const prisma = new PrismaClient({
  adapter: createPrismaPgAdapter({
    connectionString: process.env.DATABASE_URL ?? "",
    poolMax: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: Number(process.env.DATABASE_POOL_IDLE_TIMEOUT_MS ?? 30_000),
    connectionTimeoutMillis: Number(
      process.env.DATABASE_POOL_CONNECTION_TIMEOUT_MS ?? 10_000,
    ),
  }),
});

const PLATFORM_ADMIN = {
  fullName: "Ahmed Mohamed",
  email: "ahmed_291023@outlook.com",
  password: "Ahmed$$1711",
  isActive: true,
} as const;

async function main() {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);
  const normalizedEmail = PLATFORM_ADMIN.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(
    PLATFORM_ADMIN.password.trim(),
    saltRounds,
  );

  const admin = await prisma.platformAdmin.upsert({
    where: { email: normalizedEmail },
    update: {
      fullName: PLATFORM_ADMIN.fullName,
      passwordHash,
      isActive: PLATFORM_ADMIN.isActive,
    },
    create: {
      fullName: PLATFORM_ADMIN.fullName,
      email: normalizedEmail,
      passwordHash,
      isActive: PLATFORM_ADMIN.isActive,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      isActive: true,
    },
  });

  console.log("Platform admin seeded:", admin);
}

main()
  .catch((error) => {
    console.error("Failed to seed platform admin:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
