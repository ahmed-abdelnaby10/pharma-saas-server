export interface AddPurchaseOrderItemDto {
  inventoryItemId: string;
  quantityOrdered: number;
  unitCost?: number | null;
  /** Unit price before discount; populated from OCR extraction */
  originalUnitPrice?: number | null;
  /** Line discount % 0–100; populated from OCR extraction */
  discountPercent?: number | null;
  /** Batch/lot number from OCR extraction */
  batchNumber?: string | null;
  /** Expiry date ISO string from OCR extraction */
  expiryDate?: string | null;
}
