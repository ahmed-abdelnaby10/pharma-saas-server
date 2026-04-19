export interface AddPurchaseOrderItemDto {
  inventoryItemId: string;
  quantityOrdered: number;
  unitCost?: number | null;
}
