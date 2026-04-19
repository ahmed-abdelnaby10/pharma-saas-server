import {
  Sale,
  SaleItem,
  Payment,
  SaleStatus,
  PaymentMethod,
} from "@prisma/client";

export type SaleWithRelations = Sale & {
  items: SaleItem[];
  payments: Payment[];
};

export type SaleRecord = SaleWithRelations;

export interface SaleItemResponse {
  id: string;
  inventoryItemId: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
}

export interface PaymentResponse {
  id: string;
  paymentMethod: PaymentMethod;
  amount: string;
  reference: string | null;
  createdAt: Date;
}

export interface SaleResponse {
  id: string;
  tenantId: string;
  branchId: string;
  shiftId: string;
  saleNumber: string;
  status: SaleStatus;
  subtotal: string;
  vatPercentage: string;
  vatAmount: string;
  total: string;
  notes: string | null;
  items: SaleItemResponse[];
  payments: PaymentResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export function mapSaleResponse(sale: SaleRecord): SaleResponse {
  return {
    id: sale.id,
    tenantId: sale.tenantId,
    branchId: sale.branchId,
    shiftId: sale.shiftId,
    saleNumber: sale.saleNumber,
    status: sale.status,
    subtotal: sale.subtotal.toString(),
    vatPercentage: sale.vatPercentage.toString(),
    vatAmount: sale.vatAmount.toString(),
    total: sale.total.toString(),
    notes: sale.notes,
    items: sale.items.map((item) => ({
      id: item.id,
      inventoryItemId: item.inventoryItemId,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      subtotal: item.subtotal.toString(),
    })),
    payments: sale.payments.map((payment) => ({
      id: payment.id,
      paymentMethod: payment.paymentMethod,
      amount: payment.amount.toString(),
      reference: payment.reference,
      createdAt: payment.createdAt,
    })),
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
  };
}
