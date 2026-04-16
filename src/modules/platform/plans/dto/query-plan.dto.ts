import { BillingInterval } from "@prisma/client";

export type QueryPlansDto = {
  search?: string;
  isActive?: boolean;
  billingInterval?: BillingInterval;
};
