export interface ReceiveLineDto {
  purchaseOrderItemId: string;
  quantityReceived: number;
  batchNumber: string;
  expiryDate: string; // ISO 8601
  unitCost?: number | null;
}

export interface ReceivePurchaseOrderDto {
  items: ReceiveLineDto[];
}
