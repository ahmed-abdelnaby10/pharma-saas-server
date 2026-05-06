import { Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { QuerySubscriptionsDto } from "../dto/query-subscription.dto";
import {
  subscriptionInclude,
  SubscriptionWithRelations,
} from "../mapper/subscriptions.mapper";

const subscriptionWithPlanFeaturesInclude = {
  plan: {
    include: { features: true },
  },
} satisfies Prisma.SubscriptionInclude;

export type SubscriptionWithPlanFeatures = Prisma.SubscriptionGetPayload<{
  include: typeof subscriptionWithPlanFeaturesInclude;
}>;

// Non-terminal statuses — subscription is still in effect
const ACTIVE_STATUSES: SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
];

export class SubscriptionsRepository {
  async findById(
    subscriptionId: string,
  ): Promise<SubscriptionWithRelations | null> {
    return prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: subscriptionInclude,
    });
  }

  async listByTenant(
    tenantId: string,
    query: QuerySubscriptionsDto,
  ): Promise<SubscriptionWithRelations[]> {
    return prisma.subscription.findMany({
      where: {
        tenantId,
        ...(query.status ? { status: query.status } : {}),
      },
      include: subscriptionInclude,
      orderBy: [{ createdAt: "desc" }],
    });
  }

  /**
   * Returns the most recent subscription with a non-terminal status
   * (trialing | active | past_due). Returns null if none found.
   */
  async findCurrentByTenant(
    tenantId: string,
  ): Promise<SubscriptionWithRelations | null> {
    return prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ACTIVE_STATUSES },
      },
      include: subscriptionInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: {
    tenantId: string;
    planId: string;
    status: SubscriptionStatus;
    startsAt: Date;
    trialEndsAt?: Date;
  }): Promise<SubscriptionWithRelations> {
    return prisma.subscription.create({
      data: {
        tenantId: data.tenantId,
        planId: data.planId,
        status: data.status,
        startsAt: data.startsAt,
        ...(data.trialEndsAt ? { trialEndsAt: data.trialEndsAt } : {}),
      },
      include: subscriptionInclude,
    });
  }

  /**
   * Cancel the current subscription and create a new one for the new plan
   * in a single transaction.
   *
   * Trial carry-over rules:
   * - New plan trialDays === 0  → trial ends immediately regardless of how
   *   much time was left; Tenant.isTrialActive is cleared, Tenant.trialEndsAt
   *   is set to now, new subscription status is "active".
   * - New plan trialDays > 0 AND tenant is still within its trial window
   *   → original trialEndsAt is carried over (clock is NOT reset).
   * - Tenant not in trial → new subscription is "active" regardless.
   */
  async changePlanWithTransaction(data: {
    tenantId: string;
    currentSubscriptionId: string;
    newPlanId: string;
    newPlanTrialDays: number;
    tenantIsTrialActive: boolean;
    tenantTrialEndsAt: Date | null;
  }): Promise<SubscriptionWithRelations> {
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      // 1. Cancel the current subscription
      await tx.subscription.update({
        where: { id: data.currentSubscriptionId },
        data: {
          status: "canceled",
          canceledAt: now,
          endsAt: now,
        },
      });

      // 2. Determine whether the tenant stays in trial.
      //    If the new plan has no trial days, force-end the trial even when
      //    the tenant is still within their original window.
      const stillInTrial =
        data.newPlanTrialDays > 0 &&
        data.tenantIsTrialActive &&
        data.tenantTrialEndsAt !== null &&
        data.tenantTrialEndsAt > now;

      // 3. If the trial is being cut short, clear tenant trial fields so other
      //    parts of the system (auth token, access checks) see the correct state.
      if (!stillInTrial && data.tenantIsTrialActive) {
        await tx.tenant.update({
          where: { id: data.tenantId },
          data: { isTrialActive: false, trialEndsAt: now },
        });
      }

      // 4. Create new subscription
      const newStatus: SubscriptionStatus = stillInTrial ? "trialing" : "active";
      const newTrialEndsAt = stillInTrial ? data.tenantTrialEndsAt! : undefined;

      return tx.subscription.create({
        data: {
          tenantId: data.tenantId,
          planId: data.newPlanId,
          status: newStatus,
          startsAt: now,
          ...(newTrialEndsAt ? { trialEndsAt: newTrialEndsAt } : {}),
        },
        include: subscriptionInclude,
      });
    });
  }

  /**
   * Cancel the subscription and, when it was trialing, flip
   * tenant.isTrialActive to false — all in one transaction.
   */
  async cancelWithTransaction(data: {
    tenantId: string;
    subscriptionId: string;
    wasTrialing: boolean;
  }): Promise<SubscriptionWithRelations> {
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.update({
        where: { id: data.subscriptionId },
        data: {
          status: "canceled",
          canceledAt: now,
          endsAt: now,
        },
        include: subscriptionInclude,
      });

      if (data.wasTrialing) {
        await tx.tenant.update({
          where: { id: data.tenantId },
          data: { isTrialActive: false },
        });
      }

      return subscription;
    });
  }

  /**
   * Returns the current active subscription with plan features included.
   * Used for plan-limit enforcement in tenant modules.
   */
  async findCurrentWithPlanFeaturesByTenant(
    tenantId: string,
  ): Promise<SubscriptionWithPlanFeatures | null> {
    return prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ACTIVE_STATUSES },
      },
      include: subscriptionWithPlanFeaturesInclude,
      orderBy: { createdAt: "desc" },
    });
  }
}

export const subscriptionsRepository = new SubscriptionsRepository();