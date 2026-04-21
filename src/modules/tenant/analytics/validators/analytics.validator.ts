import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";
import {
  TopItemsQueryDto,
  RevenueTrendQueryDto,
  PaymentMethodsQueryDto,
} from "../dto/query-analytics.dto";

const dateRange = {
  branchId: z.string().cuid(),
  from: z
    .string()
    .datetime({ offset: true })
    .transform((v) => new Date(v)),
  to: z
    .string()
    .datetime({ offset: true })
    .transform((v) => new Date(v)),
};

const topItemsSchema = z.object({
  ...dateRange,
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().min(1).max(50)),
});

const revenueTrendSchema = z.object({
  ...dateRange,
  granularity: z.enum(["day", "week"]).default("day"),
});

const paymentMethodsSchema = z.object(dateRange);

export function parseTopItemsQuery(query: unknown): TopItemsQueryDto {
  const result = topItemsSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseRevenueTrendQuery(query: unknown): RevenueTrendQueryDto {
  const result = revenueTrendSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parsePaymentMethodsQuery(query: unknown): PaymentMethodsQueryDto {
  const result = paymentMethodsSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}
