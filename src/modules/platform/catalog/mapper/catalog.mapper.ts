import { CatalogItem } from "@prisma/client";

export type CatalogItemRecord = CatalogItem;

export const mapCatalogItemResponse = (item: CatalogItemRecord) => ({
  id: item.id,
  nameEn: item.nameEn,
  nameAr: item.nameAr,
  genericNameEn: item.genericNameEn,
  genericNameAr: item.genericNameAr,
  barcode: item.barcode,
  sku: item.sku,
  category: item.category,
  unitOfMeasure: item.unitOfMeasure,
  dosageForm: item.dosageForm,
  strength: item.strength,
  manufacturer: item.manufacturer,
  isActive: item.isActive,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});
