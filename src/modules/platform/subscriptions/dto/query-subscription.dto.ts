import { SubscriptionStatus } from "@prisma/client";

export type QuerySubscriptionsDto = {
  status?: SubscriptionStatus;
};
