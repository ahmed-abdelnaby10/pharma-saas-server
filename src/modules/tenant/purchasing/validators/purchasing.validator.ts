import { z } from "zod";
import { PurchaseOrderStatus } from "@prisma/client";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { CreatePurchaseOrderDto } from "../dto/create-purchase-order.dto";
import { UpdatePurchaseOrderDto } from "../dto/update-purchase-order.dto";
import { QueryPurchaseOrdersDto } from "../dto/query-purchase-orders.dto";
import { AddPurchaseOrderItemDto } from "../dto/add-purchase-order-item.dto";
import { UpdatePurchaseOrderItemDto } from "../dto/update-purchase-order-item.dto";
import { ReceivePurchaseOrderDto } from "../dto/receive-purchase-order.dto";

const statuses = Object.values(PurchaseOrderStatus) as [string, ...string[]];

const createOrderSchema = z.object({
  branchId: z.string().cuid("Invalid branchId"),
  supplierId: z.string().cuid("Invalid supplierId").nullable().optional(),
  orderNumber: z.string().min(1).max(64).optional(),
  notes: z.string().max(500).nullable().optional(),
  expectedAt: z.string().datetime({ offset: true }).nullable().optional(),
  externalId: z.string().max(128).nullish(),
});

const updateOrderSchema = z
  .object({
    supplierId: z.string().cuid("Invalid supplierId").nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    expectedAt: z.string().datetime({ offset: true }).nullable().optional(),
    status: z
      .enum(statuses as [PurchaseOrderStatus, ...PurchaseOrderStatus[]])
      .optional(),
  })
  .refine(
    (d) =>
      d.supplierId !== undefined ||
      d.notes !== undefined ||
      d.expectedAt !== undefined ||
      d.status !== undefined,
    { message: "At least one field must be provided" },
  );

const queryOrderSchema = z.object({
  branchId: z.string().cuid("branchId is required"),
  status: z
    .enum(statuses as [PurchaseOrderStatus, ...PurchaseOrderStatus[]])
    .optional(),
  supplierId: z.string().cuid("Invalid supplierId").optional(),
});

const addItemSchema = z.object({
  inventoryItemId: z.string().cuid("Invalid inventoryItemId"),
  quantityOrdered: z.number().positive("quantityOrdered must be positive"),
  unitCost: z.number().positive().nullable().optional(),
});

const updateItemSchema = z
  .object({
    quantityOrdered: z.number().positive().optional(),
    unitCost: z.number().positive().nullable().optional(),
  })
  .refine((d) => d.quantityOrdered !== undefined || d.unitCost !== undefined, {
    message: "At least one field must be provided",
  });

const receiveLineSchema = z.object({
  purchaseOrderItemId: z.string().cuid("Invalid purchaseOrderItemId"),
  quantityReceived: z.number().positive("quantityReceived must be positive"),
  batchNumber: z.string().min(1).max(100),
  expiryDate: z
    .string()
    .datetime({ offset: true })
    .refine((v) => new Date(v) > new Date(), { message: "expiryDate must be in the future" }),
  unitCost: z.number().positive().nullable().optional(),
});

const receiveOrderSchema = z.object({
  items: z.array(receiveLineSchema).min(1, "At least one item must be provided"),
});

const orderIdParamSchema = z.object({ orderId: z.string().cuid("Invalid orderId") });
const poItemIdParamSchema = z.object({ poItemId: z.string().cuid("Invalid poItemId") });

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseCreatePurchaseOrderDto = (b: unknown): CreatePurchaseOrderDto =>
  parse(createOrderSchema, b);
export const parseUpdatePurchaseOrderDto = (b: unknown): UpdatePurchaseOrderDto =>
  parse(updateOrderSchema, b);
export const parseQueryPurchaseOrdersDto = (q: unknown): QueryPurchaseOrdersDto =>
  parse(queryOrderSchema, q) as QueryPurchaseOrdersDto;
export const parseAddPurchaseOrderItemDto = (b: unknown): AddPurchaseOrderItemDto =>
  parse(addItemSchema, b);
export const parseUpdatePurchaseOrderItemDto = (b: unknown): UpdatePurchaseOrderItemDto =>
  parse(updateItemSchema, b);
export const parseReceivePurchaseOrderDto = (b: unknown): ReceivePurchaseOrderDto =>
  parse(receiveOrderSchema, b);
export const parseOrderIdParam = (p: unknown): string =>
  parse(orderIdParamSchema, p).orderId;
export const parsePoItemIdParam = (p: unknown): string =>
  parse(poItemIdParamSchema, p).poItemId;
