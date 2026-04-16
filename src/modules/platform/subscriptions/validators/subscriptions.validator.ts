import { z } from "zod";
import { ChangeSubscriptionDto } from "../dto/change-subscription.dto";
import { CreateSubscriptionDto } from "../dto/create-subscription.dto";
import { QuerySubscriptionsDto } from "../dto/query-subscription.dto";

const createSubscriptionSchema = z.object({
  planId: z.string().trim().min(1),
});

const changeSubscriptionSchema = z.object({
  planId: z.string().trim().min(1),
});

const querySubscriptionsSchema = z.object({
  status: z
    .enum(["trialing", "active", "past_due", "canceled", "expired"])
    .optional(),
});

const tenantIdParamSchema = z.object({
  tenantId: z.string().trim().min(1),
});

export const parseCreateSubscriptionDto = (
  input: unknown,
): CreateSubscriptionDto => {
  return createSubscriptionSchema.parse(input) as CreateSubscriptionDto;
};

export const parseChangeSubscriptionDto = (
  input: unknown,
): ChangeSubscriptionDto => {
  return changeSubscriptionSchema.parse(input) as ChangeSubscriptionDto;
};

export const parseQuerySubscriptionsDto = (
  input: unknown,
): QuerySubscriptionsDto => {
  return querySubscriptionsSchema.parse(input) as QuerySubscriptionsDto;
};

export const parseTenantIdParam = (input: unknown): string => {
  return tenantIdParamSchema.parse(input).tenantId;
};