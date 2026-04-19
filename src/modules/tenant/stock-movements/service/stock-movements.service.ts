import { Prisma, StockMovementType } from "@prisma/client";
import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { CreateStockMovementDto } from "../dto/create-stock-movement.dto";
import { QueryStockMovementsDto } from "../dto/query-stock-movements.dto";
import { StockMovementRecord } from "../mapper/stock-movements.mapper";
import {
  stockMovementsRepository,
  StockMovementsRepository,
} from "../repository/stock-movements.repository";
import { prisma } from "../../../../core/db/prisma";

const INBOUND_TYPES = new Set<StockMovementType>([
  StockMovementType.INBOUND,
  StockMovementType.ADJUSTMENT_IN,
  StockMovementType.RETURN_IN,
]);

export class StockMovementsService {
  constructor(private readonly repository: StockMovementsRepository) {}

  async listMovements(
    auth: TenantAuthContext,
    query: QueryStockMovementsDto,
  ): Promise<StockMovementRecord[]> {
    await this.assertBranchBelongsToTenant(auth.tenantId, query.branchId);
    return this.repository.list(auth.tenantId, query);
  }

  /**
   * Creates a manual adjustment movement and atomically updates
   * InventoryItem.quantityOnHand (and InventoryBatch.quantityOnHand if batchId provided).
   */
  async createMovement(
    auth: TenantAuthContext,
    payload: CreateStockMovementDto,
  ): Promise<StockMovementRecord> {
    await this.assertBranchBelongsToTenant(auth.tenantId, payload.branchId);

    const item = await prisma.inventoryItem.findFirst({
      where: { id: payload.inventoryItemId, tenantId: auth.tenantId },
    });
    if (!item) {
      throw new NotFoundError("Inventory item not found", undefined, "inventory.not_found");
    }

    let batch: { id: string; quantityOnHand: Prisma.Decimal } | null = null;
    if (payload.batchId) {
      batch = await prisma.inventoryBatch.findFirst({
        where: {
          id: payload.batchId,
          inventoryItemId: payload.inventoryItemId,
          tenantId: auth.tenantId,
        },
        select: { id: true, quantityOnHand: true },
      });
      if (!batch) {
        throw new NotFoundError("Batch not found", undefined, "inventory_batch.not_found");
      }
    }

    const qty = new Prisma.Decimal(payload.quantity);
    const isInbound = INBOUND_TYPES.has(payload.movementType);

    // Validate sufficient stock for outbound movements
    if (!isInbound) {
      if (batch) {
        if (batch.quantityOnHand.lt(qty)) {
          throw new ConflictError(
            "Insufficient batch quantity",
            undefined,
            "stock.insufficient_batch_quantity",
          );
        }
      } else {
        if (item.quantityOnHand.lt(qty)) {
          throw new ConflictError(
            "Insufficient stock quantity",
            undefined,
            "stock.insufficient_quantity",
          );
        }
      }
    }

    return prisma.$transaction(async (tx) => {
      // Snapshot quantity before
      const itemQtyBefore = item.quantityOnHand;
      const itemQtyAfter = isInbound
        ? itemQtyBefore.add(qty)
        : itemQtyBefore.sub(qty);

      // Update item quantity
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantityOnHand: itemQtyAfter },
      });

      // Update batch quantity if applicable
      if (batch) {
        const batchQtyAfter = isInbound
          ? batch.quantityOnHand.add(qty)
          : batch.quantityOnHand.sub(qty);
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: { quantityOnHand: batchQtyAfter },
        });
      }

      // Record the movement
      return this.repository.createInTransaction(tx, {
        tenantId: auth.tenantId,
        branchId: payload.branchId,
        inventoryItemId: payload.inventoryItemId,
        batchId: payload.batchId ?? null,
        movementType: payload.movementType,
        quantity: qty,
        quantityBefore: itemQtyBefore,
        quantityAfter: itemQtyAfter,
        referenceType: payload.referenceType ?? null,
        referenceId: payload.referenceId ?? null,
        notes: payload.notes ?? null,
      });
    });
  }

  private async assertBranchBelongsToTenant(tenantId: string, branchId: string): Promise<void> {
    const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId } });
    if (!branch) {
      throw new ForbiddenError("Branch not found or does not belong to this tenant");
    }
  }
}

export const stockMovementsService = new StockMovementsService(stockMovementsRepository);
