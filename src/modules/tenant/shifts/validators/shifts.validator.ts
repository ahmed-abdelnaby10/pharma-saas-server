import { z } from "zod";
import { ShiftStatus } from "@prisma/client";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { OpenShiftDto } from "../dto/open-shift.dto";
import { CloseShiftDto } from "../dto/close-shift.dto";
import { QueryShiftsDto } from "../dto/query-shifts.dto";
import { CreateCashAdjustmentDto } from "../dto/cash-adjustment.dto";

const shiftStatuses = Object.values(ShiftStatus) as [string, ...string[]];

const openShiftSchema = z.object({
  branchId: z.string().cuid("Invalid branchId"),
  openingBalance: z.number().nonnegative("openingBalance must be >= 0"),
  notes: z.string().max(500).nullable().optional(),
  externalId: z.string().max(128).nullish(),
  clientCreatedAt: z.string().datetime({ offset: true }).nullish(),
});

const closeShiftSchema = z.object({
  closingBalance: z.number().nonnegative("closingBalance must be >= 0"),
  notes: z.string().max(500).nullable().optional(),
  clientClosedAt: z.string().datetime({ offset: true }).nullish(),
});

const queryShiftsSchema = z.object({
  branchId: z.string().cuid("branchId is required"),
  status: z.enum(shiftStatuses as [ShiftStatus, ...ShiftStatus[]]).optional(),
  userId: z.string().cuid("Invalid userId").optional(),
});

const shiftIdParamSchema = z.object({
  shiftId: z.string().cuid("Invalid shiftId"),
});

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

// ── Cash adjustment ───────────────────────────────────────────────────────────
// Accept both lower-case ("cash_in") and upper-case ("CASH_IN") and normalise
// to the Prisma enum value (CASH_IN / CASH_OUT).
const cashAdjustmentSchema = z.object({
  type: z
    .string()
    .transform((v) => v.toUpperCase())
    .pipe(z.enum(["CASH_IN", "CASH_OUT"])),
  // Accept string or number; validate as a positive decimal
  amount: z.preprocess(
    (v) => (typeof v === "number" ? String(v) : v),
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "amount must be a positive number with up to 2 decimal places")
      .refine((v) => parseFloat(v) > 0, "amount must be greater than 0"),
  ),
  reason: z.string().min(1).max(1000).nullable().optional(),
});

export const parseOpenShiftDto = (b: unknown): OpenShiftDto => parse(openShiftSchema, b);
export const parseCloseShiftDto = (b: unknown): CloseShiftDto => parse(closeShiftSchema, b);
export const parseQueryShiftsDto = (q: unknown): QueryShiftsDto =>
  parse(queryShiftsSchema, q) as QueryShiftsDto;
export const parseShiftIdParam = (p: unknown): string =>
  parse(shiftIdParamSchema, p).shiftId;
export const parseCashAdjustmentDto = (b: unknown): CreateCashAdjustmentDto =>
  parse(cashAdjustmentSchema, b) as CreateCashAdjustmentDto;
