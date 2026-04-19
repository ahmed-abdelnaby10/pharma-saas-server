import { Supplier } from "@prisma/client";

export type SupplierRecord = Supplier;

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
