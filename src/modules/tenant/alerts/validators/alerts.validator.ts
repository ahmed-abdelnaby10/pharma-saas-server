import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { QueryLowStockDto, QueryExpiringDto } from "../dto/query-alerts.dto";

const queryLowStockSchema = z.object({
  branchId: z.string().cuid(),
});

const queryExpiringSchema = z.object({
  branchId: z.string().cuid(),
  days: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 30))
    .pipe(z.number().int().min(1).max(365)),
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
