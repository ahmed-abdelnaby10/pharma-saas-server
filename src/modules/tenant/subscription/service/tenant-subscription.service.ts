import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { subscriptionsRepository } from "../../../platform/subscriptions/repository/subscriptions.repository";
import { usageLimitService } from "../../../../core/usage/usage-limit.service";

export interface EntitlementResponse {
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  /** true when a platform admin override is in effect for this feature */
  isOverride: boolean;
}

export interface TenantSubscriptionResponse {
  subscriptionId: string;
  planCode: string;
  planName: string;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  trialEndsAt: Date | null;
  entitlements: EntitlementResponse[];
}

export class TenantSubscriptionService {
  async getCurrent(auth: TenantAuthContext): Promise<TenantSubscriptionResponse> {
    const sub = await subscriptionsRepository.findCurrentWithPlanFeaturesByTenant(
      auth.tenantId,
    );

    if (!sub) {
      throw new NotFoundError(
        "No active subscription found",
        undefined,
        "subscription.not_found",
      );
    }

    const entitlements = await usageLimitService.getEffectiveEntitlements(auth.tenantId);

    return {
      subscriptionId: sub.id,
      planCode: sub.plan.code,
      planName: sub.plan.name,
      status: sub.status,
      startsAt: sub.startsAt,
      endsAt: sub.endsAt ?? null,
      trialEndsAt: sub.trialEndsAt ?? null,
      entitlements: entitlements.map((e) => ({
        featureKey: e.featureKey,
        enabled: e.enabled,
        limitValue: e.limitValue,
        isOverride: e.isOverride,
      })),
    };
  }
}

export const tenantSubscriptionService = new TenantSubscriptionService();
