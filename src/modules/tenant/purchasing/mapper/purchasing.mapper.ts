import {
  Prisma,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  Supplier,
  InventoryItem,
  CatalogItem,
} from "@prisma/client";

export type PurchaseOrderItemWithInventory = PurchaseOrderItem & {
  // New OCR-sourced fields (present after prisma generate; declared here for build safety)
  originalUnitPrice?: Prisma.Decimal | null;
  discountPercent?:   Prisma.Decimal | null;
  batchNumber?:       string | null;
  expiryDate?:        Date   | null;
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
  /** Unit cost after discount (what was actually paid per unit) */
  unitCost: string | null;
  /** Unit price before any line discount */
  originalUnitPrice: string | null;
  /** Line discount percentage 0–100 */
  discountPercent: string | null;
  /** Line total: unitCost × quantityOrdered */
  lineTotal: string | null;
  /** Line total before discount: originalUnitPrice × quantityOrdered */
  lineTotalBeforeDiscount: string | null;
  /** Batch/lot number from invoice OCR */
  batchNumber: string | null;
  /** Expiry date from invoice OCR */
  expiryDate: Date | null;
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
  /** Echoed back so the desktop can reconcile its local SQLite record. */
  externalId: string | null;
  items: PurchaseOrderItemResponse[];
  /** Sum of lineTotalBeforeDiscount across all items (null when no price data) */
  subtotalBeforeDiscount: string | null;
  /** Sum of (lineTotalBeforeDiscount − lineTotal) — total discount amount saved */
  totalDiscount: string | null;
  /** Sum of lineTotal across all items (null when no price data) */
  subtotal: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapPurchaseOrderItemResponse(
  item: PurchaseOrderItemWithInventory,
): PurchaseOrderItemResponse {
  const qty      = Number(item.quantityOrdered.toString());
  const unitCost = item.unitCost          ? Number(item.unitCost.toString())          : null;
  const origUnit = item.originalUnitPrice ? Number(item.originalUnitPrice.toString()) : null;

  const lineTotal              = unitCost != null ? (unitCost * qty).toFixed(4)  : null;
  const lineTotalBeforeDiscount = origUnit != null ? (origUnit * qty).toFixed(4) : null;

  return {
    id:             item.id,
    purchaseOrderId: item.purchaseOrderId,
    inventoryItemId: item.inventoryItemId,
    inventoryItem: {
      id: item.inventoryItem.id,
      catalogItem: {
        id:           item.inventoryItem.catalogItem.id,
        nameEn:       item.inventoryItem.catalogItem.nameEn,
        nameAr:       item.inventoryItem.catalogItem.nameAr,
        unitOfMeasure: item.inventoryItem.catalogItem.unitOfMeasure,
      },
    },
    quantityOrdered:         item.quantityOrdered.toString(),
    quantityReceived:        item.quantityReceived.toString(),
    unitCost:                 unitCost != null ? unitCost.toString() : null,
    originalUnitPrice:        origUnit != null ? origUnit.toString() : null,
    discountPercent: item.discountPercent != null
      ? Number(item.discountPercent.toString()).toString()
      : null,
    lineTotal,
    lineTotalBeforeDiscount,
    batchNumber: item.batchNumber ?? null,
    expiryDate:  item.expiryDate  ?? null,
    createdAt:  item.createdAt,
    updatedAt:  item.updatedAt,
  };
}

export function mapPurchaseOrderResponse(order: PurchaseOrderWithRelations): PurchaseOrderResponse {
  const mappedItems = order.items.map(mapPurchaseOrderItemResponse);

  // Compute order-level totals only when at least one item has price data
  let subtotalBeforeDiscount: string | null = null;
  let totalDiscount: string | null = null;
  let subtotal: string | null = null;

  const hasPriceData = mappedItems.some(
    (i) => i.lineTotal != null || i.lineTotalBeforeDiscount != null,
  );
  if (hasPriceData) {
    let sumBefore = 0;
    let sumAfter  = 0;
    for (const i of mappedItems) {
      // Prefer lineTotalBeforeDiscount; fall back to lineTotal (no discount info)
      const before = i.lineTotalBeforeDiscount != null
        ? Number(i.lineTotalBeforeDiscount)
        : i.lineTotal != null ? Number(i.lineTotal) : 0;
      const after  = i.lineTotal != null ? Number(i.lineTotal) : before;
      sumBefore += before;
      sumAfter  += after;
    }
    subtotalBeforeDiscount = sumBefore.toFixed(4);
    subtotal               = sumAfter.toFixed(4);
    totalDiscount          = (sumBefore - sumAfter).toFixed(4);
  }

  return {
    id:          order.id,
    tenantId:    order.tenantId,
    branchId:    order.branchId,
    supplierId:  order.supplierId,
    supplier: order.supplier
      ? { id: order.supplier.id, nameEn: order.supplier.nameEn, nameAr: order.supplier.nameAr }
      : null,
    orderNumber: order.orderNumber,
    status:      order.status,
    notes:       order.notes,
    orderedAt:   order.orderedAt,
    expectedAt:  order.expectedAt,
    externalId:  order.externalId ?? null,
    items:       mappedItems,
    subtotalBeforeDiscount,
    totalDiscount,
    subtotal,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
