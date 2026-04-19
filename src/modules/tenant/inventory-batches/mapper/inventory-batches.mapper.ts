import { InventoryBatch, Supplier } from "@prisma/client";

export type InventoryBatchWithSupplier = InventoryBatch & {
  supplier: Supplier | null;
};

export type InventoryBatchRecord = InventoryBatchWithSupplier;

export interface InventoryBatchResponse {
  id: string;
  tenantId: string;
  branchId: string;
  inventoryItemId: string;
  supplierId: string | null;
  supplier: {
    id: string;
    nameEn: string;
    nameAr: string;
  } | null;
  batchNumber: string;
  expiryDate: Date;
  quantityReceived: string;
  quantityOnHand: string;
  costPrice: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function mapInventoryBatchResponse(batch: InventoryBatchRecord): InventoryBatchResponse {
  return {
    id: batch.id,
    tenantId: batch.tenantId,
    branchId: batch.branchId,
    inventoryItemId: batch.inventoryItemId,
    supplierId: batch.supplierId,
    supplier: batch.supplier
      ? {
          id: batch.supplier.id,
          nameEn: batch.supplier.nameEn,
          nameAr: batch.supplier.nameAr,
        }
      : null,
    batchNumber: batch.batchNumber,
    expiryDate: batch.expiryDate,
    quantityReceived: batch.quantityReceived.toString(),
    quantityOnHand: batch.quantityOnHand.toString(),
    costPrice: batch.costPrice ? batch.costPrice.toString() : null,
    isActive: batch.isActive,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };
}
