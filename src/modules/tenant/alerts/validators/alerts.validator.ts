import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { QueryLowStockDto, QueryExpiringDto, QueryAllAlertsDto } from "../dto/query-alerts.dto";

const queryLowStockSchema = z.object({
  branchId: z.string().cuid(),
});

const queryExpiringSchema = z.object({
  branchId: z.string().cuid(),
  // days is optional — omit to let the service fall back to expiryAlertWindowDays from settings
  days: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(1).max(365).optional()),
});

export function parseQueryLowStock(query: unknown): QueryLowStockDto {
  const result = queryLowStockSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseQueryExpiring(query: unknown): QueryExpiringDto {
  const result = queryExpiringSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

const queryAllAlertsSchema = queryExpiringSchema;

export function parseQueryAllAlerts(query: unknown): QueryAllAlertsDto {
  const result = queryAllAlertsSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

// notify is a POST — branchId comes from body, days is optional (falls back to settings)
const notifyBodySchema = z.object({
  branchId: z.string().cuid(),
  days: z.number().int().min(1).max(365).optional(),
});

export function parseNotifyBody(body: unknown): QueryAllAlertsDto {
  const result = notifyBodySchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}
