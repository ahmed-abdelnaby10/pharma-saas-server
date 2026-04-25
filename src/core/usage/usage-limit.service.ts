import { PlanFeature } from "@prisma/client";
import { subscriptionsRepository } from "../../modules/platform/subscriptions/repository/subscriptions.repository";
import { ForbiddenError } from "../../shared/errors/forbidden-error";
import { PaymentRequiredError } from "../../shared/errors/payment-required-error";
import { FeatureKeyValue } from "../../shared/constants/feature-keys";

export class UsageLimitService {
  /**
   * Fetch the active subscription's plan features.
   * Throws ForbiddenError when there is no active subscription.
   */
  private async getFeatures(tenantId: string): Promise<PlanFeature[]> {
    const sub = await subscriptionsRepository.findCurrentWithPlanFeaturesByTenant(tenantId);
    if (!sub) {
      throw new ForbiddenError(
        "No active subscription found",
        undefined,
        "subscription.not_found",
      );
    }
    return sub.plan.features ?? [];
  }

  /**
   * Asserts that a boolean feature flag is enabled on the tenant's plan.
   * Throws PaymentRequiredError when the feature is absent or disabled.
   */
  async assertFeatureEnabled(tenantId: string, featureKey: FeatureKeyValue): Promise<void> {
    const features = await this.getFeatures(tenantId);
    const feat = features.find((f) => f.featureKey === featureKey);
    if (!feat || !feat.enabled) {
      throw new PaymentRequiredError(
        `Feature '${featureKey}' is not available on your plan`,
        { featureKey },
        "plan.feature_disabled",
      );
    }
  }

  /**
   * Asserts that the current count is below the plan limit for a countable
   * feature. If the feature is absent from the plan the limit is not enforced.
   * Throws PaymentRequiredError when the limit is reached or exceeded.
   */
  async assertCountUnderLimit(
    tenantId: string,
    featureKey: FeatureKeyValue,
    currentCount: number,
  ): Promise<void> {
    const features = await this.getFeatures(tenantId);
    const feat = features.find((f) => f.featureKey === featureKey && f.enabled);
    if (feat && feat.limitValue !== null && currentCount >= feat.limitValue) {
      throw new PaymentRequiredError(
        `Limit reached for '${featureKey}' on your plan`,
        { featureKey, limit: feat.limitValue, current: currentCount },
        "plan.limit_exceeded",
      );
    }
  }

  /**
   * Returns the raw feature list for the tenant's active plan.
   * Useful for building entitlement summaries in API responses.
   */
  async getEntitlements(tenantId: string): Promise<PlanFeature[]> {
    return this.getFeatures(tenantId);
  }
}

export const usageLimitService = new UsageLimitService();
