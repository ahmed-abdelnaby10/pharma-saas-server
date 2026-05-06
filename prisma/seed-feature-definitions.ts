/// <reference types="node" />
/**
 * Seeds the FeatureDefinition table from FEATURE_REGISTRY.
 * Idempotent — uses upsert on "key", safe to re-run at any time.
 *
 * Run with:
 *   npx ts-node prisma/seed-feature-definitions.ts
 *
 * Also called internally by the migration SQL for self-contained deploys.
 * Re-run whenever a new feature key is added to feature-registry.ts.
 *
 * IMPORTANT: Never remove a key from FEATURE_REGISTRY.
 * To retire a key, set isActive = false — the upsert will propagate it.
 */
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createPrismaPgAdapter } from "../src/core/db/pg-adapter";
import { FEATURE_REGISTRY } from "../src/core/features/feature-registry";

dotenv.config();

const prisma = new PrismaClient({
  adapter: createPrismaPgAdapter({
    connectionString: process.env.DATABASE_URL ?? "",
    poolMax: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  }),
});

async function main() {
  console.log(`Seeding ${FEATURE_REGISTRY.length} feature definitions…`);

  for (const def of FEATURE_REGISTRY) {
    await prisma.featureDefinition.upsert({
      where:  { key: def.key },
      update: {
        type:          def.type,
        labelEn:       def.labelEn,
        labelAr:       def.labelAr,
        descriptionEn: def.descriptionEn,
        descriptionAr: def.descriptionAr,
        module:        def.module,
        requiresKeys:  def.requiresKeys as string[],
        isActive:      def.isActive,
      },
      create: {
        key:           def.key,
        type:          def.type,
        labelEn:       def.labelEn,
        labelAr:       def.labelAr,
        descriptionEn: def.descriptionEn,
        descriptionAr: def.descriptionAr,
        module:        def.module,
        requiresKeys:  def.requiresKeys as string[],
        isActive:      def.isActive,
      },
    });
  }

  // Soft-disable any keys that are in the DB but no longer in the registry
  const activeKeys = FEATURE_REGISTRY.map((f) => f.key);
  const deactivated = await prisma.featureDefinition.updateMany({
    where: { key: { notIn: activeKeys }, isActive: true },
    data:  { isActive: false },
  });

  if (deactivated.count > 0) {
    console.warn(
      `Soft-disabled ${deactivated.count} retired feature key(s). ` +
        "Their PlanFeature rows are untouched — existing tenants retain access until plan change.",
    );
  }

  console.log("Feature definitions seeded successfully.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
