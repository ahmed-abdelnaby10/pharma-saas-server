import { z } from "zod";
import { PaymentMethod, SaleStatus } from "@prisma/client";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { CreateSaleDto } from "../dto/create-sale.dto";
import { QuerySalesDto } from "../dto/query-sales.dto";

const saleLine = z.object({
  inventoryItemId: z.string().cuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

const createSaleSchema = z.object({
  branchId: z.string().cuid(),
  shiftId: z.string().cuid(),
  items: z.array(saleLine).min(1),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentAmount: z.number().nonnegative(),
  paymentReference: z.string().max(100).nullish(),
  notes: z.string().max(500).nullish(),
});

const querySalesSchema = z.object({
  branchId: z.string().cuid(),
  shiftId: z.string().cuid().optional(),
  status: z.nativeEnum(SaleStatus).optional(),
  from: z
    .string()
    .datetime({ offset: true })
    .transform((v) => new Date(v))
    .optional(),
  to: z
    .string()
    .datetime({ offset: true })
    .transform((v) => new Date(v))
    .optional(),
});

export function parseCreateSale(body: unknown): CreateSaleDto {
  const result = createSaleSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data as CreateSaleDto;
}

export function parseQuerySales(query: unknown): QuerySalesDto {
  const result = querySalesSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data as QuerySalesDto;
}

const saleIdParamSchema = z.object({ saleId: z.string().cuid() });

export function parseSaleIdParam(params: unknown): string {
  const result = saleIdParamSchema.safeParse(params);
  if (!result.success) {
    throw new BadRequestError("Invalid sale ID");
  }
  return result.data.saleId;
}
