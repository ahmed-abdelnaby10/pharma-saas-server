import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { CreateInventoryBatchDto } from "../dto/create-inventory-batch.dto";
import { UpdateInventoryBatchDto } from "../dto/update-inventory-batch.dto";
import { QueryInventoryBatchesDto } from "../dto/query-inventory-batches.dto";
import { InventoryBatchRecord } from "../mapper/inventory-batches.mapper";
import {
  inventoryBatchesRepository,
  InventoryBatchesRepository,
} from "../repository/inventory-batches.repository";
import { prisma } from "../../../../core/db/prisma";

export class InventoryBatchesService {
  constructor(private readonly repository: InventoryBatchesRepository) {}

  async listBatches(
    auth: TenantAuthContext,
    inventoryItemId: string,
    query: QueryInventoryBatchesDto,
  ): Promise<InventoryBatchRecord[]> {
    await this.assertInventoryItemBelongsToTenant(auth.tenantId, inventoryItemId);
    return this.repository.list(auth.tenantId, inventoryItemId, query);
  }

  async getBatch(
    auth: TenantAuthContext,
    inventoryItemId: string,
    batchId: string,
  ): Promise<InventoryBatchRecord> {
    await this.assertInventoryItemBelongsToTenant(auth.tenantId, inventoryItemId);
    const batch = await this.repository.findById(auth.tenantId, inventoryItemId, batchId);
    if (!batch) {
      throw new NotFoundError("Batch not found", undefined, "inventory_batch.not_found");
    }
    return batch;
  }

  async createBatch(
    auth: TenantAuthContext,
    inventoryItemId: string,
    payload: CreateInventoryBatchDto,
  ): Promise<InventoryBatchRecord> {
    const item = await this.assertInventoryItemBelongsToTenant(auth.tenantId, inventoryItemId);

    const existing = await this.repository.findByBatchNumber(inventoryItemId, payload.batchNumber);
    if (existing) {
      throw new ConflictError(
        "A batch with this batch number already exists for this item",
        undefined,
        "inventory_batch.duplicate",
      );
    }

    if (payload.supplierId) {
      await this.assertSupplierBelongsToTenant(auth.tenantId, payload.supplierId);
    }

    return this.repository.create(auth.tenantId, item.branchId, inventoryItemId, payload);
  }

  async updateBatch(
    auth: TenantAuthContext,
    inventoryItemId: string,
    batchId: string,
    payload: UpdateInventoryBatchDto,
  ): Promise<InventoryBatchRecord> {
    await this.assertInventoryItemBelongsToTenant(auth.tenantId, inventoryItemId);
    const batch = await this.repository.findById(auth.tenantId, inventoryItemId, batchId);
    if (!batch) {
      throw new NotFoundError("Batch not found", undefined, "inventory_batch.not_found");
    }

    if (payload.supplierId) {
      await this.assertSupplierBelongsToTenant(auth.tenantId, payload.supplierId);
    }

    return this.repository.update(auth.tenantId, batchId, payload);
  }

  async deactivateBatch(
    auth: TenantAuthContext,
    inventoryItemId: string,
    batchId: string,
  ): Promise<InventoryBatchRecord> {
    await this.assertInventoryItemBelongsToTenant(auth.tenantId, inventoryItemId);
    const batch = await this.repository.findById(auth.tenantId, inventoryItemId, batchId);
    if (!batch) {
      throw new NotFoundError("Batch not found", undefined, "inventory_batch.not_found");
    }
    if (!batch.isActive) {
      throw new ConflictError(
        "Batch is already inactive",
        undefined,
        "inventory_batch.already_inactive",
      );
    }
    return this.repository.deactivate(auth.tenantId, batchId);
  }

  private async assertInventoryItemBelongsToTenant(tenantId: string, inventoryItemId: string) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, tenantId },
    });
    if (!item) {
      throw new ForbiddenError("Inventory item not found or does not belong to this tenant");
    }
    return item;
  }

  private async assertSupplierBelongsToTenant(
    tenantId: string,
    supplierId: string,
  ): Promise<void> {
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId } });
    if (!supplier) {
      throw new NotFoundError(
        "Supplier not found or does not belong to this tenant",
        undefined,
        "supplier.not_found",
      );
    }
  }
}

export const inventoryBatchesService = new InventoryBatchesService(inventoryBatchesRepository);
