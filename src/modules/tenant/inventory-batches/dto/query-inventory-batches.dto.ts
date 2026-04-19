export interface QueryInventoryBatchesDto {
  isActive?: boolean;
  expiringSoonDays?: number; // return batches expiring within N days
}
