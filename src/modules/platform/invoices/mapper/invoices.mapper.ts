import { PlatformInvoice, PlatformInvoiceStatus } from "@prisma/client";

export type InvoiceRecord = PlatformInvoice;

export interface InvoiceResponse {
  id: string;
  tenantId: string;
  subscriptionId: string | null;
  invoiceNumber: string;
  status: PlatformInvoiceStatus;
  amount: string;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapInvoiceResponse(inv: InvoiceRecord): InvoiceResponse {
  return {
    id: inv.id,
    tenantId: inv.tenantId,
    subscriptionId: inv.subscriptionId,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    amount: inv.amount.toString(),
    currency: inv.currency,
    periodStart: inv.periodStart,
    periodEnd: inv.periodEnd,
    dueDate: inv.dueDate,
    paidAt: inv.paidAt,
    notes: inv.notes,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}
