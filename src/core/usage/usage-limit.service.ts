import { TenantFeatureOverride } from "@prisma/client";
import { prisma } from "../db/prisma";
import { subscriptionsRepository } from "../../modules/platform/subscriptions/repository/subscriptions.repository";
import { ForbiddenError } from "../../shared/errors/forbidden-error";
import { PaymentRequiredError } from "../../shared/errors/payment-required-error";
import { FeatureKeyValue } from "../../shared/constants/feature-keys";

export interface EffectiveFeature {
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  /** true when this entry comes from a tenant-level override rather than the plan */
  isOverride: boolean;
}

export class UsageLimitService {
  /**
   * Builds effective entitlements by merging plan features with tenant overrides.
   * Override wins when a featureKey appears in both.
   * Throws ForbiddenError when there is no active subscription.
   */
  async getEffectiveEntitlements(tenantId: string): Promise<EffectiveFeature[]> {
    const [sub, overrides] = await Promise.all([
      subscriptionsRepository.findCurrentWithPlanFeaturesByTenant(tenantId),
      prisma.tenantFeatureOverride.findMany({ where: { tenantId } }),
    ]);

    if (!sub) {
      throw new ForbiddenError(
        "No active subscription found",
        undefined,
        "subscription.not_found",
      );
    }

    const overrideMap = new Map<string, TenantFeatureOverride>(
      overrides.map((o) => [o.featureKey, o]),
    );

    // Start from plan features, replacing with override when present
    const result = new Map<string, EffectiveFeature>();

    for (const f of sub.plan.features) {
      const override = overrideMap.get(f.featureKey);
      if (override) {
        result.set(f.featureKey, {
          featureKey: f.featureKey,
          enabled: override.enabled,
          limitValue: override.limitValue ?? null,
          isOverride: true,
        });
      } else {
        result.set(f.featureKey, {
          featureKey: f.featureKey,
          enabled: f.enabled,
          limitValue: f.limitValue ?? null,
          isOverride: false,
        });
      }
    }

    // Add any overrides for feature keys not in the plan
    for (const [key, override] of overrideMap) {
      if (!result.has(key)) {
        result.set(key, {
          featureKey: key,
          enabled: override.enabled,
          limitValue: override.limitValue ?? null,
          isOverride: true,
        });
      }
    }

    return Array.from(result.values());
  }

  /**
   * Resolves a single feature's effective value (plan + override merged).
   */
  private async getEffective(
    tenantId: string,
    featureKey: FeatureKeyValue,
  ): Promise<EffectiveFeature | null> {
    const all = await this.getEffectiveEntitlements(tenantId);
    return all.find((f) => f.featureKey === featureKey) ?? null;
  }

  /**
   * Asserts that a boolean feature flag is enabled (plan or override).
   * Throws PaymentRequiredError when absent or disabled.
   */
  async assertFeatureEnabled(tenantId: string, featureKey: FeatureKeyValue): Promise<void> {
    const feat = await this.getEffective(tenantId, featureKey);
    if (!feat || !feat.enabled) {
      throw new PaymentRequiredError(
        `Feature '${featureKey}' is not available on your plan`,
        { featureKey },
        "plan.feature_disabled",
      );
    }
  }

  /**
   * Asserts that currentCount is below the effective limit.
   * If the feature is absent or has no limitValue, enforcement is skipped.
   * Throws PaymentRequiredError when at or over the limit.
   */
  async assertCountUnderLimit(
    tenantId: string,
    featureKey: FeatureKeyValue,
    currentCount: number,
  ): Promise<void> {
    const feat = await this.getEffective(tenantId, featureKey);
    if (feat && feat.enabled && feat.limitValue !== null && currentCount >= feat.limitValue) {
      throw new PaymentRequiredError(
        `Limit reached for '${featureKey}' on your plan`,
        { featureKey, limit: feat.limitValue, current: currentCount },
        "plan.limit_exceeded",
      );
    }
  }
}

export const usageLimitService = new UsageLimitService();
