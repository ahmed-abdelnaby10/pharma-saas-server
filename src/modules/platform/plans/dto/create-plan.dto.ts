import { BillingInterval } from "@prisma/client";

export type PlanFeatureInputDto = {
  featureKey: string;
  enabled: boolean;
  limitValue?: number;
};

export type CreatePlanDto = {
  code: string;
  name: string;
  description?: string;
  billingInterval: BillingInterval;
  price: number;
  currency: string;
  trialDays: number;
  isActive: boolean;
  features: PlanFeatureInputDto[];
};
