import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  Supplier,
  InventoryItem,
  CatalogItem,
} from "@prisma/client";

export type PurchaseOrderItemWithInventory = PurchaseOrderItem & {
  inventoryItem: InventoryItem & { catalogItem: CatalogItem };
};

export type PurchaseOrderWithRelations = PurchaseOrder & {
  supplier: Supplier | null;
  items: PurchaseOrderItemWithInventory[];
};

export interface PurchaseOrderItemResponse {
  id: string;
  purchaseOrderId: string;
  inventoryItemId: string;
  inventoryItem: {
    id: string;
    catalogItem: { id: string; nameEn: string; nameAr: string; unitOfMeasure: string };
  };
  quantityOrdered: string;
  quantityReceived: string;
  unitCost: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderResponse {
  id: string;
  tenantId: string;
  branchId: string;
  supplierId: string | null;
  supplier: { id: string; nameEn: string; nameAr: string } | null;
  orderNumber: string;
  status: PurchaseOrderStatus;
  notes: string | null;
  orderedAt: Date | null;
  expectedAt: Date | null;
  items: PurchaseOrderItemResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export function mapPurchaseOrderItemResponse(
  item: PurchaseOrderItemWithInventory,
): PurchaseOrderItemResponse {
  return {
    id: item.id,
    purchaseOrderId: item.purchaseOrderId,
    inventoryItemId: item.inventoryItemId,
    inventoryItem: {
      id: item.inventoryItem.id,
      catalogItem: {
        id: item.inventoryItem.catalogItem.id,
        nameEn: item.inventoryItem.catalogItem.nameEn,
        nameAr: item.inventoryItem.catalogItem.nameAr,
        unitOfMeasure: item.inventoryItem.catalogItem.unitOfMeasure,
      },
    },
    quantityOrdered: item.quantityOrdered.toString(),
    quantityReceived: item.quantityReceived.toString(),
    unitCost: item.unitCost ? item.unitCost.toString() : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function mapPurchaseOrderResponse(order: PurchaseOrderWithRelations): PurchaseOrderResponse {
  return {
    id: order.id,
    tenantId: order.tenantId,
    branchId: order.branchId,
    supplierId: order.supplierId,
    supplier: order.supplier
      ? { id: order.supplier.id, nameEn: order.supplier.nameEn, nameAr: order.supplier.nameAr }
      : null,
    orderNumber: order.orderNumber,
    status: order.status,
    notes: order.notes,
    orderedAt: order.orderedAt,
    expectedAt: order.expectedAt,
    items: order.items.map(mapPurchaseOrderItemResponse),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
