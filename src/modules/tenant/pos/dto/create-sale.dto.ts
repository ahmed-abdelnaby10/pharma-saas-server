import { PaymentMethod } from "@prisma/client";

export interface SaleLineDto {
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleDto {
  branchId: string;
  shiftId: string;
  items: SaleLineDto[];
  paymentMethod: PaymentMethod;
  paymentAmount: number;
  paymentReference?: string | null;
  notes?: string | null;
  /** Client-generated sync ID for data-level idempotency. Max 128 chars. */
  externalId?: string | null;
  /** Client-generated receipt number (e.g. "BR1-S5-0042"). When provided and
   *  unique, the server uses it verbatim. Falls back to server-generated. */
  saleNumber?: string | null;
  /** When the sale was recorded on the desktop (offline timestamp). */
  clientCreatedAt?: string | null;
  patientId?: string | null;
}
