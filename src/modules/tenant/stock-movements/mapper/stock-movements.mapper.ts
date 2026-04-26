import { StockMovement, StockMovementType } from "@prisma/client";

export type StockMovementRecord = StockMovement;

export interface StockMovementResponse {
  id: string;
  tenantId: string;
  branchId: string;
  inventoryItemId: string;
  batchId: string | null;
  movementType: StockMovementType;
  quantity: string;
  quantityBefore: string;
  quantityAfter: string;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  /** Echoed back so the desktop can reconcile its local SQLite record. */
  externalId: string | null;
  /** When the movement was recorded on the desktop (offline timestamp). Null for online movements. */
  clientCreatedAt: Date | null;
  createdAt: Date;
}

export function mapStockMovementResponse(movement: StockMovementRecord): StockMovementResponse {
  return {
    id: movement.id,
    tenantId: movement.tenantId,
    branchId: movement.branchId,
    inventoryItemId: movement.inventoryItemId,
    batchId: movement.batchId,
    movementType: movement.movementType,
    quantity: movement.quantity.toString(),
    quantityBefore: movement.quantityBefore.toString(),
    quantityAfter: movement.quantityAfter.toString(),
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    notes: movement.notes,
    externalId: movement.externalId ?? null,
    clientCreatedAt: movement.clientCreatedAt ?? null,
    createdAt: movement.createdAt,
  };
}
