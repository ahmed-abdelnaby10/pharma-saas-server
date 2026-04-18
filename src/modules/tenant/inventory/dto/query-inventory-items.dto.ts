export interface QueryInventoryItemsDto {
  branchId: string;
  isActive?: boolean;
  lowStock?: boolean;
  search?: string;
}
