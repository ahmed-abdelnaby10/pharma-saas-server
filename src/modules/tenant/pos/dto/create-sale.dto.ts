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
}
