export interface QueryInventoryItemsDto {
  branchId: string;
  isActive?: boolean;
  lowStock?: boolean;
  search?: string;
  /** ISO 8601 string — return only items with updatedAt > this value (delta sync support) */
  updatedSince?: string;
}
