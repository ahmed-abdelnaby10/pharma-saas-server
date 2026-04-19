export interface UpdateInventoryBatchDto {
  expiryDate?: string; // ISO date string
  costPrice?: number | null;
  supplierId?: string | null;
}
