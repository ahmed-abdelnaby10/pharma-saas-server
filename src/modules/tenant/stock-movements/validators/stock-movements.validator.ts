import { z } from "zod";
import { StockMovementType } from "@prisma/client";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { CreateStockMovementDto } from "../dto/create-stock-movement.dto";
import { QueryStockMovementsDto } from "../dto/query-stock-movements.dto";

const movementTypes = Object.values(StockMovementType) as [string, ...string[]];

const createStockMovementSchema = z.object({
  branchId: z.string().cuid("Invalid branchId"),
  inventoryItemId: z.string().cuid("Invalid inventoryItemId"),
  batchId: z.string().cuid("Invalid batchId").nullable().optional(),
  movementType: z.enum(movementTypes as [StockMovementType, ...StockMovementType[]]),
  quantity: z.number().positive("quantity must be a positive number"),
  referenceType: z.string().min(1).max(64).nullable().optional(),
  referenceId: z.string().min(1).max(128).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const queryStockMovementsSchema = z.object({
  branchId: z.string().cuid("branchId is required and must be a valid CUID"),
  inventoryItemId: z.string().cuid("Invalid inventoryItemId").optional(),
  batchId: z.string().cuid("Invalid batchId").optional(),
  movementType: z.enum(movementTypes as [StockMovementType, ...StockMovementType[]]).optional(),
  from: z
    .string()
    .datetime({ offset: true })
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  to: z
    .string()
    .datetime({ offset: true })
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseCreateStockMovementDto = (body: unknown): CreateStockMovementDto =>
  parse(createStockMovementSchema, body);

export const parseQueryStockMovementsDto = (query: unknown): QueryStockMovementsDto =>
  parse(queryStockMovementsSchema, query) as QueryStockMovementsDto;
