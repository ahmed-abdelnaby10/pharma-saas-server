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
  /** Client-generated SQLite primary key for offline desktop reconciliation (data-level dedup). */
  externalId?: string | null;
  /** When the movement was recorded on the desktop (offline timestamp). */
  clientCreatedAt?: string | null;
}
