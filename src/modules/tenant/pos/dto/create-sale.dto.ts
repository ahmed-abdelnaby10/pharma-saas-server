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
  /**
   * Optional client-generated identifier from the desktop SQLite store.
   * When provided the backend stores it on the Sale record and uses it for
   * data-level idempotency: a second submission with the same externalId
   * returns the existing Sale rather than creating a duplicate.
   * Max 128 characters; any opaque string is accepted (UUID recommended).
   */
  externalId?: string | null;
  patientId?: string | null;
}
