import { StockMovementType } from "@prisma/client";

export interface QueryStockMovementsDto {
  branchId: string;
  inventoryItemId?: string;
  batchId?: string;
  movementType?: StockMovementType;
  from?: Date;
  to?: Date;
}
