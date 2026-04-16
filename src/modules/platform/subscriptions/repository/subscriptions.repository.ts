import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { QuerySubscriptionsDto } from "../dto/query-subscription.dto";
import {
  subscriptionInclude,
  SubscriptionWithRelations,
} from "../mapper/subscriptions.mapper";

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
   * in a single transaction. Carries over trial status when the tenant is
   * still within its trial window.
   */
  async changePlanWithTransaction(data: {
    tenantId: string;
    currentSubscriptionId: string;
    newPlanId: string;
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

      // 2. Determine status for the new subscription
      const stillInTrial =
        data.tenantIsTrialActive &&
        data.tenantTrialEndsAt !== null &&
        data.tenantTrialEndsAt > now;

      const newStatus: SubscriptionStatus = stillInTrial ? "trialing" : "active";
      const newTrialEndsAt = stillInTrial ? data.tenantTrialEndsAt! : undefined;

      // 3. Create new subscription
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
}

export const subscriptionsRepository = new SubscriptionsRepository();