import { z } from "zod";
import { PlatformInvoiceStatus } from "@prisma/client";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { CreateInvoiceDto } from "../dto/create-invoice.dto";
import { QueryInvoicesDto } from "../dto/query-invoices.dto";

const createInvoiceSchema = z.object({
  tenantId: z.string().cuid(),
  subscriptionId: z.string().cuid().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  dueDate: z.coerce.date(),
  notes: z.string().max(1000).optional(),
});

const queryInvoicesSchema = z.object({
  tenantId: z.string().cuid().optional(),
  status: z.nativeEnum(PlatformInvoiceStatus).optional(),
});

const invoiceIdSchema = z.object({ invoiceId: z.string().cuid() });

export function parseCreateInvoiceDto(body: unknown): CreateInvoiceDto {
  const result = createInvoiceSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseQueryInvoicesDto(query: unknown): QueryInvoicesDto {
  const result = queryInvoicesSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseInvoiceIdParam(params: unknown): string {
  const result = invoiceIdSchema.safeParse(params);
  if (!result.success) {
    throw new BadRequestError("Invalid invoice ID");
  }
  return result.data.invoiceId;
}
