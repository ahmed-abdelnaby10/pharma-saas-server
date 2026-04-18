import { InventoryItem, CatalogItem } from "@prisma/client";

export type InventoryItemWithCatalog = InventoryItem & {
  catalogItem: CatalogItem;
};

export type InventoryItemRecord = InventoryItemWithCatalog;

export interface InventoryItemResponse {
  id: string;
  tenantId: string;
  branchId: string;
  catalogItemId: string;
  catalogItem: {
    id: string;
    nameEn: string;
    nameAr: string;
    genericNameEn: string | null;
    genericNameAr: string | null;
    barcode: string | null;
    sku: string | null;
    category: string | null;
    unitOfMeasure: string;
    dosageForm: string | null;
    strength: string | null;
    manufacturer: string | null;
  };
  quantityOnHand: string;
  reorderLevel: string | null;
  sellingPrice: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function mapInventoryItemResponse(item: InventoryItemRecord): InventoryItemResponse {
  return {
    id: item.id,
    tenantId: item.tenantId,
    branchId: item.branchId,
    catalogItemId: item.catalogItemId,
    catalogItem: {
      id: item.catalogItem.id,
      nameEn: item.catalogItem.nameEn,
      nameAr: item.catalogItem.nameAr,
      genericNameEn: item.catalogItem.genericNameEn,
      genericNameAr: item.catalogItem.genericNameAr,
      barcode: item.catalogItem.barcode,
      sku: item.catalogItem.sku,
      category: item.catalogItem.category,
      unitOfMeasure: item.catalogItem.unitOfMeasure,
      dosageForm: item.catalogItem.dosageForm,
      strength: item.catalogItem.strength,
      manufacturer: item.catalogItem.manufacturer,
    },
    quantityOnHand: item.quantityOnHand.toString(),
    reorderLevel: item.reorderLevel ? item.reorderLevel.toString() : null,
    sellingPrice: item.sellingPrice ? item.sellingPrice.toString() : null,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
