import {
  Sale,
  SaleItem,
  Payment,
  InventoryItem,
  Branch,
  Shift,
  TenantUser,
  SaleStatus,
  PaymentMethod,
} from "@prisma/client";

export type SaleWithRelations = Sale & {
  items: SaleItem[];
  payments: Payment[];
};

export type SaleRecord = SaleWithRelations;

// Receipt includes deep relations for print-ready output
export type ReceiptSaleItem = SaleItem & {
  inventoryItem: InventoryItem & {
    catalogItem: { nameEn: string; nameAr: string; unitOfMeasure: string } | null;
  };
};

export type ReceiptRecord = Sale & {
  items: ReceiptSaleItem[];
  payments: Payment[];
  shift: Shift & { user: Pick<TenantUser, "id" | "fullName"> };
  branch: Pick<Branch, "id" | "nameEn" | "nameAr" | "address" | "phone">;
};

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
  /** Echoed back from the request so the desktop can reconcile SQLite ↔ server. */
  externalId: string | null;
  patientId: string | null;
  items: SaleItemResponse[];
  payments: PaymentResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptLineItem {
  id: string;
  inventoryItemId: string;
  nameEn: string;
  nameAr: string;
  unitOfMeasure: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
}

export interface ReceiptResponse {
  // Tenant branding
  organizationName: string | null;
  taxId: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  // Branch
  branch: {
    id: string;
    nameEn: string;
    nameAr: string;
    address: string | null;
    phone: string | null;
  };
  // Cashier
  cashier: { id: string; fullName: string };
  // Sale
  id: string;
  saleNumber: string;
  status: SaleStatus;
  subtotal: string;
  vatPercentage: string;
  vatAmount: string;
  total: string;
  notes: string | null;
  items: ReceiptLineItem[];
  payments: PaymentResponse[];
  issuedAt: Date;
}

export interface TenantBranding {
  organizationName: string | null;
  taxId: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
}

export function mapReceiptResponse(
  sale: ReceiptRecord,
  branding: TenantBranding,
): ReceiptResponse {
  return {
    organizationName: branding.organizationName,
    taxId: branding.taxId,
    receiptHeader: branding.receiptHeader,
    receiptFooter: branding.receiptFooter,
    branch: {
      id: sale.branch.id,
      nameEn: sale.branch.nameEn,
      nameAr: sale.branch.nameAr,
      address: sale.branch.address ?? null,
      phone: sale.branch.phone ?? null,
    },
    cashier: {
      id: sale.shift.user.id,
      fullName: sale.shift.user.fullName,
    },
    id: sale.id,
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
      nameEn: item.inventoryItem.catalogItem?.nameEn ?? "",
      nameAr: item.inventoryItem.catalogItem?.nameAr ?? "",
      unitOfMeasure: item.inventoryItem.catalogItem?.unitOfMeasure ?? "",
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
    issuedAt: sale.createdAt,
  };
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
    externalId: sale.externalId ?? null,
    patientId: sale.patientId ?? null,
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
