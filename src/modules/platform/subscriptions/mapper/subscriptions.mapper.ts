import { Prisma } from "@prisma/client";

export const subscriptionInclude = {
  plan: true,
  tenant: {
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      status: true,
      isTrialActive: true,
      trialEndsAt: true,
    },
  },
} satisfies Prisma.SubscriptionInclude;

export type SubscriptionWithRelations = Prisma.SubscriptionGetPayload<{
  include: typeof subscriptionInclude;
}>;

export const mapSubscriptionResponse = (sub: SubscriptionWithRelations) => {
  return {
    id: sub.id,
    tenantId: sub.tenantId,
    status: sub.status,
    startsAt: sub.startsAt,
    endsAt: sub.endsAt,
    trialEndsAt: sub.trialEndsAt,
    canceledAt: sub.canceledAt,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    plan: {
      id: sub.plan.id,
      code: sub.plan.code,
      name: sub.plan.name,
      billingInterval: sub.plan.billingInterval,
      price: sub.plan.price.toString(),
      currency: sub.plan.currency,
      trialDays: sub.plan.trialDays,
    },
    tenant: {
      id: sub.tenant.id,
      nameEn: sub.tenant.nameEn,
      nameAr: sub.tenant.nameAr,
      status: sub.tenant.status,
      isTrialActive: sub.tenant.isTrialActive,
      trialEndsAt: sub.tenant.trialEndsAt,
    },
  };
};