import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";
import {
  ShiftSummaryQueryDto,
  DailySalesQueryDto,
  StockValuationQueryDto,
} from "../dto/query-reports.dto";

const shiftSummarySchema = z.object({
  shiftId: z.string().cuid(),
});

const dailySalesSchema = z.object({
  branchId: z.string().cuid(),
  from: z
    .string()
    .datetime({ offset: true })
    .transform((v) => new Date(v)),
  to: z
    .string()
    .datetime({ offset: true })
    .transform((v) => new Date(v)),
});

const stockValuationSchema = z.object({
  branchId: z.string().cuid(),
});

export function parseShiftSummaryQuery(query: unknown): ShiftSummaryQueryDto {
  const result = shiftSummarySchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseDailySalesQuery(query: unknown): DailySalesQueryDto {
  const result = dailySalesSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseStockValuationQuery(query: unknown): StockValuationQueryDto {
  const result = stockValuationSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}
