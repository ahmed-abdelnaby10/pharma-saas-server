import { FeatureDefinition } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";

export class FeatureDefinitionsRepository {
  /** Returns ALL definitions ordered by module then key — for admin UI. */
  async list(includeInactive = false): Promise<FeatureDefinition[]> {
    return prisma.featureDefinition.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ module: "asc" }, { key: "asc" }],
    });
  }

  /** Single lookup by primary key. */
  async findByKey(key: string): Promise<FeatureDefinition | null> {
    return prisma.featureDefinition.findUnique({ where: { key } });
  }

  /**
   * Bulk lookup — used by the plans service to validate submitted feature keys
   * without N+1 queries.
   */
  async findManyByKeys(keys: string[]): Promise<FeatureDefinition[]> {
    return prisma.featureDefinition.findMany({
      where: { key: { in: keys } },
    });
  }
}

export const featureDefinitionsRepository = new FeatureDefinitionsRepository();
