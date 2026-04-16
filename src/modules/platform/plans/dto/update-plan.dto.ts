import { BillingInterval } from "@prisma/client";
import { PlanFeatureInputDto } from "./create-plan.dto";

export type UpdatePlanDto = {
  code?: string;
  name?: string;
  description?: string;
  billingInterval?: BillingInterval;
  price?: number;
  currency?: string;
  trialDays?: number;
  isActive?: boolean;
  features?: PlanFeatureInputDto[];
};
