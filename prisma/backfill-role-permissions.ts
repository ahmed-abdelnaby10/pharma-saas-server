/// <reference types="node" />
/**
 * One-time backfill: seed default permissions for existing tenant_manager,
 * pharmacist, cashier, and inventory_clerk roles that were created before the
 * auto-seed feature was added.
 *
 * Run with:
 *   npx ts-node prisma/backfill-role-permissions.ts
 *
 * Idempotent — uses skipDuplicates, safe to re-run.
 */
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createPrismaPgAdapter } from "../src/core/db/pg-adapter";

dotenv.config();

const prisma = new PrismaClient({
  adapter: createPrismaPgAdapter({
    connectionString: process.env.DATABASE_URL ?? "",
    poolMax: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  }),
});

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  tenant_manager: [
    "branches:read", "branches:create", "branches:update",
    "users:read",    "users:create",    "users:update",
    "roles:read",
    "inventory:read",  "inventory:create",  "inventory:update",
    "purchasing:read", "purchasing:create", "purchasing:update",
    "sales:read",      "sales:create",      "sales:return",
    "shifts:read",     "shifts:manage",
    "reports:read",
    "settings:read",   "settings:update",
    "suppliers:read",  "suppliers:create",  "suppliers:update",
  ],
  pharmacist: [
    "inventory:read",  "inventory:create",  "inventory:update",
    "purchasing:read", "purchasing:create", "purchasing:update",
    "sales:read",      "sales:create",
    "shifts:read",     "shifts:manage",
    "reports:read",
    "suppliers:read",
  ],
  cashier: [
    "sales:read",   "sales:create",
    "shifts:read",  "shifts:manage",
    "inventory:read",
    "reports:read",
  ],
  inventory_clerk: [
    "inventory:read",  "inventory:create",  "inventory:update",
    "purchasing:read", "purchasing:create", "purchasing:update",
    "suppliers:read",  "suppliers:create",  "suppliers:update",
    "reports:read",
    "shifts:read",
  ],
};

async function main() {
  const targetCodes = Object.keys(DEFAULT_ROLE_PERMISSIONS);

  // Pre-fetch all permissions once
  const allPerms = await prisma.permission.findMany({ select: { id: true, code: true } });
  if (allPerms.length === 0) {
    console.log("No permissions found — run seed-permissions.ts first.");
    return;
  }
  const permByCode = new Map(allPerms.map((p) => [p.code, p.id]));
  console.log(`Found ${allPerms.length} permissions in DB.`);

  // Find all matching roles across all tenants
  const roles = await prisma.role.findMany({
    where: { code: { in: targetCodes } },
    select: { id: true, code: true, tenantId: true },
  });
  console.log(`Found ${roles.length} role(s) to backfill.`);

  let totalAssigned = 0;

  for (const role of roles) {
    const codes = DEFAULT_ROLE_PERMISSIONS[role.code] ?? [];
    const permIds = codes
      .map((c) => permByCode.get(c))
      .filter((id): id is string => id !== undefined);

    if (permIds.length === 0) continue;

    const result = await prisma.rolePermission.createMany({
      data: permIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });

    console.log(
      `  [${role.code}] tenant ${role.tenantId}: ${result.count} permission(s) assigned.`,
    );
    totalAssigned += result.count;
  }

  console.log(`Done — ${totalAssigned} RolePermission row(s) created in total.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
