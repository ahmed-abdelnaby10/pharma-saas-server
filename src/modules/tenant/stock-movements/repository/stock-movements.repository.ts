import { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { QueryStockMovementsDto } from "../dto/query-stock-movements.dto";
import { StockMovementRecord } from "../mapper/stock-movements.mapper";

export interface CreateMovementInput {
  tenantId: string;
  branchId: string;
  inventoryItemId: string;
  batchId?: string | null;
  movementType: StockMovementType;
  quantity: Prisma.Decimal;
  quantityBefore: Prisma.Decimal;
  quantityAfter: Prisma.Decimal;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  /** Client-generated sync ID — passed only from the public API route, not from POS internals. */
  externalId?: string | null;
  /** When the movement was recorded on the desktop (offline timestamp). */
  clientCreatedAt?: Date | null;
}

export class StockMovementsRepository {
  async findByExternalId(tenantId: string, externalId: string): Promise<StockMovementRecord | null> {
    return prisma.stockMovement.findUnique({
      where: { tenantId_externalId: { tenantId, externalId } },
    });
  }

  async list(tenantId: string, query: QueryStockMovementsDto): Promise<StockMovementRecord[]> {
    return prisma.stockMovement.findMany({
      where: {
        tenantId,
        branchId: query.branchId,
        ...(query.inventoryItemId ? { inventoryItemId: query.inventoryItemId } : {}),
        ...(query.batchId ? { batchId: query.batchId } : {}),
        ...(query.movementType ? { movementType: query.movementType } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: query.from } : {}),
                ...(query.to ? { lte: query.to } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  /**
   * Creates a movement record inside an existing transaction context.
   * Callers must manage the transaction themselves.
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    input: CreateMovementInput,
  ): Promise<StockMovementRecord> {
    return tx.stockMovement.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        inventoryItemId: input.inventoryItemId,
        ...(input.batchId != null ? { batchId: input.batchId } : {}),
        movementType: input.movementType,
        quantity: input.quantity,
        quantityBefore: input.quantityBefore,
        quantityAfter: input.quantityAfter,
        ...(input.referenceType != null ? { referenceType: input.referenceType } : {}),
        ...(input.referenceId != null ? { referenceId: input.referenceId } : {}),
        ...(input.notes != null ? { notes: input.notes } : {}),
        ...(input.externalId != null ? { externalId: input.externalId } : {}),
        ...(input.clientCreatedAt != null ? { clientCreatedAt: input.clientCreatedAt } : {}),
      },
    });
  }
}

export const stockMovementsRepository = new StockMovementsRepository();
