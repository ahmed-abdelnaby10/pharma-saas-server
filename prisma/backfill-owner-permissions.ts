/// <reference types="node" />
/**
 * One-time backfill: assign ALL permissions to every existing tenant_owner role
 * that currently has no permissions assigned.
 *
 * Run with:
 *   npx ts-node prisma/backfill-owner-permissions.ts
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

async function main() {
  // Fetch all permissions once
  const allPermissions = await prisma.permission.findMany({ select: { id: true } });
  if (allPermissions.length === 0) {
    console.log("No permissions found — run seed-permissions.ts first.");
    return;
  }
  console.log(`Found ${allPermissions.length} permissions.`);

  // Find all tenant_owner roles
  const ownerRoles = await prisma.role.findMany({
    where: { code: "tenant_owner" },
    select: { id: true, tenantId: true },
  });
  console.log(`Found ${ownerRoles.length} tenant_owner role(s).`);

  let totalAssigned = 0;

  for (const role of ownerRoles) {
    const result = await prisma.rolePermission.createMany({
      data: allPermissions.map((p) => ({
        roleId: role.id,
        permissionId: p.id,
      })),
      skipDuplicates: true,
    });
    console.log(`  tenant ${role.tenantId}: assigned ${result.count} permission(s).`);
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
