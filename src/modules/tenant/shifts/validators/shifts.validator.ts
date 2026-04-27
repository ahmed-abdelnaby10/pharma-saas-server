import { z } from "zod";
import { ShiftStatus } from "@prisma/client";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { OpenShiftDto } from "../dto/open-shift.dto";
import { CloseShiftDto } from "../dto/close-shift.dto";
import { QueryShiftsDto } from "../dto/query-shifts.dto";

const shiftStatuses = Object.values(ShiftStatus) as [string, ...string[]];

const openShiftSchema = z.object({
  branchId: z.string().cuid("Invalid branchId"),
  openingBalance: z.number().nonnegative("openingBalance must be >= 0"),
  notes: z.string().max(500).nullable().optional(),
  // Offline sync: client-generated SQLite record ID for reconciliation.
  externalId: z.string().max(128).nullish(),
});

const closeShiftSchema = z.object({
  closingBalance: z.number().nonnegative("closingBalance must be >= 0"),
  notes: z.string().max(500).nullable().optional(),
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

export const parseOpenShiftDto = (b: unknown): OpenShiftDto => parse(openShiftSchema, b);
export const parseCloseShiftDto = (b: unknown): CloseShiftDto => parse(closeShiftSchema, b);
export const parseQueryShiftsDto = (q: unknown): QueryShiftsDto =>
  parse(queryShiftsSchema, q) as QueryShiftsDto;
export const parseShiftIdParam = (p: unknown): string =>
  parse(shiftIdParamSchema, p).shiftId;
