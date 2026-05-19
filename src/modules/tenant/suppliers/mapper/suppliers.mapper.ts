import { Supplier, SupplierPayment } from "@prisma/client";

export type SupplierRecord = Supplier;

export type SupplierPaymentRecord = SupplierPayment & {
  createdBy: { id: string; fullName: string };
};

export interface SupplierFinancials {
  totalOrdered:        number;   // sum of confirmed PO lines (ORDERED + RECEIVED + PARTIALLY_RECEIVED)
  totalPaid:           number;   // sum of all recorded payments
  outstanding:         number;   // totalOrdered - totalPaid
  ordersCount:         number;   // total number of non-draft, non-cancelled POs
  lastPaymentAmount:   number | null;
  lastPaymentDate:     string  | null;  // ISO date
  ordersBreakdown: {
    ORDERED:             number;
    PARTIALLY_RECEIVED:  number;
    RECEIVED:            number;
  };
}

export const mapSupplierResponse = (s: SupplierRecord) => ({
  id: s.id,
  tenantId: s.tenantId,
  nameEn: s.nameEn,
  nameAr: s.nameAr,
  phone: s.phone,
  email: s.email,
  address: s.address,
  taxId: s.taxId,
  contactName: s.contactName,
  isActive: s.isActive,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

export const mapPaymentResponse = (p: SupplierPaymentRecord) => ({
  id:          p.id,
  supplierId:  p.supplierId,
  amount:      Number(p.amount),
  method:      p.method,
  reference:   p.reference,
  paidAt:      p.paidAt,
  notes:       p.notes,
  createdBy:   { id: p.createdBy.id, fullName: p.createdBy.fullName },
  createdAt:   p.createdAt,
});
