export interface CreateInventoryBatchDto {
  batchNumber: string;
  expiryDate: string; // ISO date string, validated to be in the future
  quantityReceived: number;
  costPrice?: number | null;
  supplierId?: string | null;
}
