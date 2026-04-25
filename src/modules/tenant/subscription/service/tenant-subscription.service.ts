import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { subscriptionsRepository } from "../../../platform/subscriptions/repository/subscriptions.repository";

export interface EntitlementResponse {
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
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

    return {
      subscriptionId: sub.id,
      planCode: sub.plan.code,
      planName: sub.plan.name,
      status: sub.status,
      startsAt: sub.startsAt,
      endsAt: sub.endsAt ?? null,
      trialEndsAt: sub.trialEndsAt ?? null,
      entitlements: sub.plan.features.map((f) => ({
        featureKey: f.featureKey,
        enabled: f.enabled,
        limitValue: f.limitValue ?? null,
      })),
    };
  }
}

export const tenantSubscriptionService = new TenantSubscriptionService();
