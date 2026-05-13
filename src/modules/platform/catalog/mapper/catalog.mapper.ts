import { CatalogItem } from "@prisma/client";

export type CatalogItemRecord = CatalogItem;

export const mapCatalogItemResponse = (item: CatalogItemRecord) => ({
  id:                   item.id,
  nameEn:               item.nameEn,
  nameAr:               item.nameAr,
  genericNameEn:        item.genericNameEn,
  genericNameAr:        item.genericNameAr,
  barcode:              item.barcode,
  sku:                  item.sku,
  category:             item.category,
  unitOfMeasure:        item.unitOfMeasure,
  dosageForm:           item.dosageForm,
  strength:             item.strength,
  manufacturer:         item.manufacturer,
  description:          item.description,
  scientificName:       item.scientificName,
  atcCode:              item.atcCode,
  requiresPrescription: item.requiresPrescription,
  imageUrl:             item.imageUrl,
  status:               item.status,
  productType:          item.productType,
  source:               item.source,
  isActive:             item.isActive,
  submittedByTenantId:  item.submittedByTenantId,
  verifiedAt:           item.verifiedAt,
  lastSyncedAt:         item.lastSyncedAt,
  createdAt:            item.createdAt,
  updatedAt:            item.updatedAt,
});
