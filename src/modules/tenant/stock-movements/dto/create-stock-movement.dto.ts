import { StockMovementType } from "@prisma/client";

export interface CreateStockMovementDto {
  inventoryItemId: string;
  batchId?: string | null;
  movementType: StockMovementType;
  quantity: number;
  branchId: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
}
