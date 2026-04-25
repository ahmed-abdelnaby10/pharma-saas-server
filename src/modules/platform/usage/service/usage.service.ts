import { prisma } from "../../../../core/db/prisma";
import { subscriptionsRepository } from "../../subscriptions/repository/subscriptions.repository";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { COUNT_LIMITED_KEYS, FeatureKey } from "../../../../shared/constants/feature-keys";

export interface FeatureUsage {
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  /** Present only for count-limited features. */
  currentValue?: number;
}

export interface TenantUsageResponse {
  tenantId: string;
  planCode: string;
  planName: string;
  subscriptionStatus: string;
  features: FeatureUsage[];
}

async function resolveCurrentCount(tenantId: string, featureKey: string): Promise<number> {
  switch (featureKey) {
    case FeatureKey.MAX_BRANCHES:
      return prisma.branch.count({ where: { tenantId, isActive: true } });
    case FeatureKey.MAX_USERS:
      return prisma.tenantUser.count({ where: { tenantId, isActive: true } });
    default:
      return 0;
  }
}

export class UsageService {
  async getTenantUsage(tenantId: string): Promise<TenantUsageResponse> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundError("Tenant not found", undefined, "tenant.not_found");
    }

    const sub = await subscriptionsRepository.findCurrentWithPlanFeaturesByTenant(tenantId);
    if (!sub) {
      throw new NotFoundError(
        "No active subscription found",
        undefined,
        "subscription.not_found",
      );
    }

    const features: FeatureUsage[] = await Promise.all(
      sub.plan.features.map(async (f) => {
        const base: FeatureUsage = {
          featureKey: f.featureKey,
          enabled: f.enabled,
          limitValue: f.limitValue ?? null,
        };

        if (COUNT_LIMITED_KEYS.has(f.featureKey as any) && f.enabled && f.limitValue !== null) {
          base.currentValue = await resolveCurrentCount(tenantId, f.featureKey);
        }

        return base;
      }),
    );

    return {
      tenantId,
      planCode: sub.plan.code,
      planName: sub.plan.name,
      subscriptionStatus: sub.status,
      features,
    };
  }
}

export const usageService = new UsageService();
