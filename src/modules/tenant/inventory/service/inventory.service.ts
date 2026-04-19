import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { CreateInventoryItemDto } from "../dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "../dto/update-inventory-item.dto";
import { QueryInventoryItemsDto } from "../dto/query-inventory-items.dto";
import { InventoryItemRecord } from "../mapper/inventory.mapper";
import { inventoryRepository, InventoryRepository } from "../repository/inventory.repository";
import { prisma } from "../../../../core/db/prisma";

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  async listItems(
    auth: TenantAuthContext,
    query: QueryInventoryItemsDto,
  ): Promise<InventoryItemRecord[]> {
    await this.assertBranchBelongsToTenant(auth.tenantId, query.branchId);

    const items = await this.repository.list(auth.tenantId, query);

    if (query.lowStock) {
      // Cross-field comparison: quantityOnHand <= reorderLevel
      return items.filter(
        (item) => item.reorderLevel !== null && item.quantityOnHand.lte(item.reorderLevel),
      );
    }

    return items;
  }

  async getItem(auth: TenantAuthContext, itemId: string): Promise<InventoryItemRecord> {
    const item = await this.repository.findById(auth.tenantId, itemId);
    if (!item) {
      throw new NotFoundError("Inventory item not found", undefined, "inventory.not_found");
    }
    return item;
  }

  async createItem(
    auth: TenantAuthContext,
    payload: CreateInventoryItemDto,
  ): Promise<InventoryItemRecord> {
    await this.assertBranchBelongsToTenant(auth.tenantId, payload.branchId);
    await this.assertCatalogItemExists(payload.catalogItemId);

    const existing = await this.repository.findByBranchAndCatalogItem(
      payload.branchId,
      payload.catalogItemId,
    );
    if (existing) {
      throw new ConflictError(
        "This catalog item is already registered in the branch inventory",
        undefined,
        "inventory.duplicate",
      );
    }

    return this.repository.create(auth.tenantId, payload);
  }

  async updateItem(
    auth: TenantAuthContext,
    itemId: string,
    payload: UpdateInventoryItemDto,
  ): Promise<InventoryItemRecord> {
    const item = await this.repository.findById(auth.tenantId, itemId);
    if (!item) {
      throw new NotFoundError("Inventory item not found", undefined, "inventory.not_found");
    }
    return this.repository.update(auth.tenantId, itemId, payload);
  }

  async deactivateItem(auth: TenantAuthContext, itemId: string): Promise<InventoryItemRecord> {
    const item = await this.repository.findById(auth.tenantId, itemId);
    if (!item) {
      throw new NotFoundError("Inventory item not found", undefined, "inventory.not_found");
    }
    if (!item.isActive) {
      throw new ConflictError(
        "Inventory item is already inactive",
        undefined,
        "inventory.already_inactive",
      );
    }
    return this.repository.deactivate(auth.tenantId, itemId);
  }

  private async assertBranchBelongsToTenant(tenantId: string, branchId: string): Promise<void> {
    const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId } });
    if (!branch) {
      throw new ForbiddenError("Branch not found or does not belong to this tenant");
    }
  }

  private async assertCatalogItemExists(catalogItemId: string): Promise<void> {
    const item = await prisma.catalogItem.findUnique({ where: { id: catalogItemId } });
    if (!item || !item.isActive) {
      throw new NotFoundError(
        "Catalog item not found or inactive",
        undefined,
        "catalog.not_found",
      );
    }
  }
}

export const inventoryService = new InventoryService(inventoryRepository);
