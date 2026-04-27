import { TenantFeatureOverride } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { NotFoundError } from "../../../../shared/errors/not-found-error";

export interface UpsertOverrideDto {
  enabled: boolean;
  limitValue?: number | null;
  reason?: string | null;
}

export class FeatureOverridesService {
  async list(tenantId: string): Promise<TenantFeatureOverride[]> {
    await this.assertTenant(tenantId);
    return prisma.tenantFeatureOverride.findMany({
      where: { tenantId },
      orderBy: { featureKey: "asc" },
    });
  }

  async upsert(
    tenantId: string,
    featureKey: string,
    data: UpsertOverrideDto,
  ): Promise<TenantFeatureOverride> {
    await this.assertTenant(tenantId);
    return prisma.tenantFeatureOverride.upsert({
      where: { tenantId_featureKey: { tenantId, featureKey } },
      create: {
        tenantId,
        featureKey,
        enabled: data.enabled,
        ...(data.limitValue !== undefined ? { limitValue: data.limitValue } : {}),
        ...(data.reason != null ? { reason: data.reason } : {}),
      },
      update: {
        enabled: data.enabled,
        ...(data.limitValue !== undefined ? { limitValue: data.limitValue } : {}),
        ...(data.reason !== undefined ? { reason: data.reason } : {}),
      },
    });
  }

  async remove(tenantId: string, featureKey: string): Promise<void> {
    await this.assertTenant(tenantId);
    const existing = await prisma.tenantFeatureOverride.findUnique({
      where: { tenantId_featureKey: { tenantId, featureKey } },
    });
    if (!existing) {
      throw new NotFoundError(
        "Feature override not found",
        undefined,
        "feature_override.not_found",
      );
    }
    await prisma.tenantFeatureOverride.delete({
      where: { tenantId_featureKey: { tenantId, featureKey } },
    });
  }

  private async assertTenant(tenantId: string): Promise<void> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundError("Tenant not found", undefined, "tenant.not_found");
    }
  }
}

export const featureOverridesService = new FeatureOverridesService();
