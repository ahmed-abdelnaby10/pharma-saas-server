import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { CreateInventoryBatchDto } from "../dto/create-inventory-batch.dto";
import { UpdateInventoryBatchDto } from "../dto/update-inventory-batch.dto";
import { QueryInventoryBatchesDto } from "../dto/query-inventory-batches.dto";

const createInventoryBatchSchema = z.object({
  batchNumber: z.string().min(1).max(100),
  expiryDate: z
    .string()
    .datetime({ offset: true, message: "expiryDate must be a valid ISO 8601 date" })
    .refine((val) => new Date(val) > new Date(), {
      message: "expiryDate must be in the future",
    }),
  quantityReceived: z.number().positive("quantityReceived must be a positive number"),
  costPrice: z.number().positive().nullable().optional(),
  supplierId: z.string().cuid("Invalid supplierId").nullable().optional(),
});

const updateInventoryBatchSchema = z
  .object({
    expiryDate: z
      .string()
      .datetime({ offset: true, message: "expiryDate must be a valid ISO 8601 date" })
      .optional(),
    costPrice: z.number().positive().nullable().optional(),
    supplierId: z.string().cuid("Invalid supplierId").nullable().optional(),
  })
  .refine(
    (data) =>
      data.expiryDate !== undefined ||
      data.costPrice !== undefined ||
      data.supplierId !== undefined,
    { message: "At least one field must be provided" },
  );

const queryInventoryBatchesSchema = z.object({
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      return undefined;
    }),
  expiringSoonDays: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
    .refine((v) => v === undefined || (!isNaN(v) && v > 0), {
      message: "expiringSoonDays must be a positive integer",
    }),
});

const batchIdParamSchema = z.object({
  batchId: z.string().cuid("Invalid batchId"),
});

const itemIdParamSchema = z.object({
  itemId: z.string().cuid("Invalid itemId"),
});

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseCreateInventoryBatchDto = (body: unknown): CreateInventoryBatchDto =>
  parse(createInventoryBatchSchema, body);

export const parseUpdateInventoryBatchDto = (body: unknown): UpdateInventoryBatchDto =>
  parse(updateInventoryBatchSchema, body);

export const parseQueryInventoryBatchesDto = (query: unknown): QueryInventoryBatchesDto =>
  parse(queryInventoryBatchesSchema, query) as QueryInventoryBatchesDto;

export const parseBatchIdParam = (params: unknown): string =>
  parse(batchIdParamSchema, params).batchId;

export const parseItemIdParam = (params: unknown): string =>
  parse(itemIdParamSchema, params).itemId;
