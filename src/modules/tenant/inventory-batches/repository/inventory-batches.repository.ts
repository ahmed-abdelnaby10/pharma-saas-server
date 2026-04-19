import { Prisma } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { CreateInventoryBatchDto } from "../dto/create-inventory-batch.dto";
import { UpdateInventoryBatchDto } from "../dto/update-inventory-batch.dto";
import { QueryInventoryBatchesDto } from "../dto/query-inventory-batches.dto";
import { InventoryBatchRecord } from "../mapper/inventory-batches.mapper";

const inventoryBatchInclude = {
  supplier: true,
} satisfies Prisma.InventoryBatchInclude;

export class InventoryBatchesRepository {
  async list(
    tenantId: string,
    inventoryItemId: string,
    query: QueryInventoryBatchesDto,
  ): Promise<InventoryBatchRecord[]> {
    const now = new Date();
    const expiryCutoff =
      query.expiringSoonDays !== undefined
        ? new Date(now.getTime() + query.expiringSoonDays * 24 * 60 * 60 * 1000)
        : undefined;

    return prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        inventoryItemId,
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(expiryCutoff
          ? {
              expiryDate: { lte: expiryCutoff },
              isActive: true,
            }
          : {}),
      },
      include: inventoryBatchInclude,
      orderBy: [{ expiryDate: "asc" }],
    });
  }

  async findById(
    tenantId: string,
    inventoryItemId: string,
    batchId: string,
  ): Promise<InventoryBatchRecord | null> {
    return prisma.inventoryBatch.findFirst({
      where: { id: batchId, tenantId, inventoryItemId },
      include: inventoryBatchInclude,
    });
  }

  async findByBatchNumber(
    inventoryItemId: string,
    batchNumber: string,
  ): Promise<InventoryBatchRecord | null> {
    return prisma.inventoryBatch.findUnique({
      where: { inventoryItemId_batchNumber: { inventoryItemId, batchNumber } },
      include: inventoryBatchInclude,
    });
  }

  /**
   * Creates the batch and atomically increments parent InventoryItem.quantityOnHand.
   */
  async create(
    tenantId: string,
    branchId: string,
    inventoryItemId: string,
    payload: CreateInventoryBatchDto,
  ): Promise<InventoryBatchRecord> {
    const qty = new Prisma.Decimal(payload.quantityReceived);

    return prisma.$transaction(async (tx) => {
      const batch = await tx.inventoryBatch.create({
        data: {
          tenantId,
          branchId,
          inventoryItemId,
          batchNumber: payload.batchNumber,
          expiryDate: new Date(payload.expiryDate),
          quantityReceived: qty,
          quantityOnHand: qty,
          ...(payload.costPrice != null
            ? { costPrice: new Prisma.Decimal(payload.costPrice) }
            : {}),
          ...(payload.supplierId != null ? { supplierId: payload.supplierId } : {}),
        },
        include: inventoryBatchInclude,
      });

      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { quantityOnHand: { increment: qty } },
      });

      return batch;
    });
  }

  async update(
    tenantId: string,
    batchId: string,
    payload: UpdateInventoryBatchDto,
  ): Promise<InventoryBatchRecord> {
    return prisma.inventoryBatch.update({
      where: { id: batchId },
      data: {
        ...(payload.expiryDate !== undefined
          ? { expiryDate: new Date(payload.expiryDate) }
          : {}),
        ...(payload.costPrice !== undefined
          ? {
              costPrice:
                payload.costPrice !== null ? new Prisma.Decimal(payload.costPrice) : null,
            }
          : {}),
        ...(payload.supplierId !== undefined
          ? { supplierId: payload.supplierId ?? null }
          : {}),
      },
      include: inventoryBatchInclude,
    });
  }

  async deactivate(tenantId: string, batchId: string): Promise<InventoryBatchRecord> {
    return prisma.inventoryBatch.update({
      where: { id: batchId },
      data: { isActive: false },
      include: inventoryBatchInclude,
    });
  }
}

export const inventoryBatchesRepository = new InventoryBatchesRepository();
