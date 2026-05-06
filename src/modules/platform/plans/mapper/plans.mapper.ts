import { Prisma } from "@prisma/client";

export type PlanWithFeatures = Prisma.PlanGetPayload<{
  include: {
    features: {
      include: { definition: true };
      orderBy: { featureKey: "asc" };
    };
  };
}>;

export const mapPlanResponse = (plan: PlanWithFeatures, lang: string) => ({
  id:              plan.id,
  code:            plan.code,
  name:            plan.name,
  description:     plan.description,
  billingInterval: plan.billingInterval,
  price:           plan.price.toString(),
  currency:        plan.currency,
  trialDays:       plan.trialDays,
  isActive:        plan.isActive,
  createdAt:       plan.createdAt,
  updatedAt:       plan.updatedAt,
  features: plan.features.map((feature) => ({
    id:           feature.id,
    featureKey:   feature.featureKey,
    enabled:      feature.enabled,
    limitValue:   feature.limitValue,
    type:         feature.definition.type,
    module:       feature.definition.module,
    requiresKeys: feature.definition.requiresKeys,
    isActive:     feature.definition.isActive,
    // Locale-aware projected fields
    label:        lang === "ar" ? feature.definition.labelAr        : feature.definition.labelEn,
    description:  lang === "ar" ? feature.definition.descriptionAr  : feature.definition.descriptionEn,
    // Both languages always included so admin UIs can show both without a separate call
    labelEn:      feature.definition.labelEn,
    labelAr:      feature.definition.labelAr,
    descriptionEn: feature.definition.descriptionEn,
    descriptionAr: feature.definition.descriptionAr,
  })),
});
