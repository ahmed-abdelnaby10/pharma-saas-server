import { Prisma } from "@prisma/client";

export type PlanWithFeatures = Prisma.PlanGetPayload<{
  include: {
    features: true;
  };
}>;

export const mapPlanResponse = (plan: PlanWithFeatures) => {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    billingInterval: plan.billingInterval,
    price: plan.price.toString(),
    currency: plan.currency,
    trialDays: plan.trialDays,
    isActive: plan.isActive,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    features: plan.features
      .slice()
      .sort((left, right) => left.featureKey.localeCompare(right.featureKey))
      .map((feature) => ({
        id: feature.id,
        featureKey: feature.featureKey,
        enabled: feature.enabled,
        limitValue: feature.limitValue,
      })),
  };
};
