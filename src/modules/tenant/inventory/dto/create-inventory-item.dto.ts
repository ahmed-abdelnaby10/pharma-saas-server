export interface CreateInventoryItemDto {
  branchId: string;
  catalogItemId: string;
  reorderLevel?: number | null;
  sellingPrice?: number | null;
}
