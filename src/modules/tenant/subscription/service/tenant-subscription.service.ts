import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { subscriptionsRepository } from "../../../platform/subscriptions/repository/subscriptions.repository";
import { usageLimitService } from "../../../../core/usage/usage-limit.service";
import { FeatureKey } from "../../../../shared/constants/feature-keys";

const DEFAULT_OFFLINE_HOURS = 24;

export interface EntitlementResponse {
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  isOverride: boolean;
}

export interface LicenseEnvelope {
  issuedAt: Date;
  validUntil: Date;
  maxOfflineHours: number;
  subscriptionStatus: string;
  entitlements: EntitlementResponse[];
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
  license: LicenseEnvelope;
}

export class TenantSubscriptionService {
  async getCurrent(auth: TenantAuthContext): Promise<TenantSubscriptionResponse> {
    const sub = await subscriptionsRepository.findCurrentWithPlanFeaturesByTenant(auth.tenantId);
    if (!sub) {
      throw new NotFoundError("No active subscription found", undefined, "subscription.not_found");
    }

    const entitlements = await usageLimitService.getEffectiveEntitlements(auth.tenantId);

    const maxOfflineHoursFeature = entitlements.find(
      (e) => e.featureKey === FeatureKey.MAX_OFFLINE_HOURS,
    );
    const maxOfflineHours = maxOfflineHoursFeature?.limitValue ?? DEFAULT_OFFLINE_HOURS;

    const issuedAt = new Date();
    const validUntil = new Date(issuedAt.getTime() + maxOfflineHours * 60 * 60 * 1000);

    const entitlementResponses: EntitlementResponse[] = entitlements.map((e) => ({
      featureKey: e.featureKey,
      enabled: e.enabled,
      limitValue: e.limitValue,
      isOverride: e.isOverride,
    }));

    return {
      subscriptionId: sub.id,
      planCode: sub.plan.code,
      planName: sub.plan.name,
      status: sub.status,
      startsAt: sub.startsAt,
      endsAt: sub.endsAt ?? null,
      trialEndsAt: sub.trialEndsAt ?? null,
      entitlements: entitlementResponses,
      license: {
        issuedAt,
        validUntil,
        maxOfflineHours,
        subscriptionStatus: sub.status,
        entitlements: entitlementResponses,
      },
    };
  }
}

export const tenantSubscriptionService = new TenantSubscriptionService();
