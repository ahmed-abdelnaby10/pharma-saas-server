import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { CreateInventoryItemDto } from "../dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "../dto/update-inventory-item.dto";
import { QueryInventoryItemsDto } from "../dto/query-inventory-items.dto";

const createInventoryItemSchema = z.object({
  branchId: z.string().cuid("Invalid branchId"),
  catalogItemId: z.string().cuid("Invalid catalogItemId"),
  reorderLevel: z.number().nonnegative().nullable().optional(),
  sellingPrice: z.number().positive().nullable().optional(),
});

const updateInventoryItemSchema = z
  .object({
    reorderLevel: z.number().nonnegative().nullable().optional(),
    sellingPrice: z.number().positive().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.reorderLevel !== undefined ||
      data.sellingPrice !== undefined ||
      data.isActive !== undefined,
    { message: "At least one field must be provided" },
  );

const queryInventoryItemsSchema = z.object({
  branchId: z.string().cuid("branchId is required and must be a valid CUID"),
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      return undefined;
    }),
  lowStock: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      return undefined;
    }),
  search: z.string().min(1).max(100).optional(),
  updatedSince: z.string().datetime({ offset: true }).optional(),
});

const inventoryItemIdParamSchema = z.object({
  itemId: z.string().cuid("Invalid itemId"),
});

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseCreateInventoryItemDto = (body: unknown): CreateInventoryItemDto =>
  parse(createInventoryItemSchema, body);

export const parseUpdateInventoryItemDto = (body: unknown): UpdateInventoryItemDto =>
  parse(updateInventoryItemSchema, body);

export const parseQueryInventoryItemsDto = (query: unknown): QueryInventoryItemsDto =>
  parse(queryInventoryItemsSchema, query) as QueryInventoryItemsDto;

export const parseInventoryItemIdParam = (params: unknown): string =>
  parse(inventoryItemIdParamSchema, params).itemId;
