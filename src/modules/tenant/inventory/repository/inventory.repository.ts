import { Prisma } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { CreateInventoryItemDto } from "../dto/create-inventory-item.dto";
import { UpdateInventoryItemDto } from "../dto/update-inventory-item.dto";
import { QueryInventoryItemsDto } from "../dto/query-inventory-items.dto";
import { InventoryItemRecord } from "../mapper/inventory.mapper";

const inventoryItemInclude = {
  catalogItem: true,
} satisfies Prisma.InventoryItemInclude;

export class InventoryRepository {
  async list(tenantId: string, query: QueryInventoryItemsDto): Promise<InventoryItemRecord[]> {
    const where: Prisma.InventoryItemWhereInput = {
      tenantId,
      branchId: query.branchId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      // lowStock post-filter applied in service — only pre-filter by reorderLevel presence
      ...(query.lowStock ? { reorderLevel: { not: null } } : {}),
      ...(query.search
        ? {
            catalogItem: {
              OR: [
                { nameEn: { contains: query.search, mode: "insensitive" } },
                { nameAr: { contains: query.search, mode: "insensitive" } },
                { genericNameEn: { contains: query.search, mode: "insensitive" } },
                { genericNameAr: { contains: query.search, mode: "insensitive" } },
                { barcode: { contains: query.search, mode: "insensitive" } },
                { sku: { contains: query.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    return prisma.inventoryItem.findMany({
      where,
      include: inventoryItemInclude,
      orderBy: [{ catalogItem: { nameEn: "asc" } }],
    });
  }

  async findById(tenantId: string, itemId: string): Promise<InventoryItemRecord | null> {
    return prisma.inventoryItem.findFirst({
      where: { id: itemId, tenantId },
      include: inventoryItemInclude,
    });
  }

  async findByBranchAndCatalogItem(
    branchId: string,
    catalogItemId: string,
  ): Promise<InventoryItemRecord | null> {
    return prisma.inventoryItem.findUnique({
      where: { branchId_catalogItemId: { branchId, catalogItemId } },
      include: inventoryItemInclude,
    });
  }

  async create(tenantId: string, payload: CreateInventoryItemDto): Promise<InventoryItemRecord> {
    return prisma.inventoryItem.create({
      data: {
        tenantId,
        branchId: payload.branchId,
        catalogItemId: payload.catalogItemId,
        ...(payload.reorderLevel !== undefined && payload.reorderLevel !== null
          ? { reorderLevel: new Prisma.Decimal(payload.reorderLevel) }
          : {}),
        ...(payload.sellingPrice !== undefined && payload.sellingPrice !== null
          ? { sellingPrice: new Prisma.Decimal(payload.sellingPrice) }
          : {}),
      },
      include: inventoryItemInclude,
    });
  }

  async update(
    tenantId: string,
    itemId: string,
    payload: UpdateInventoryItemDto,
  ): Promise<InventoryItemRecord> {
    return prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        ...(payload.reorderLevel !== undefined
          ? {
              reorderLevel:
                payload.reorderLevel !== null
                  ? new Prisma.Decimal(payload.reorderLevel)
                  : null,
            }
          : {}),
        ...(payload.sellingPrice !== undefined
          ? {
              sellingPrice:
                payload.sellingPrice !== null
                  ? new Prisma.Decimal(payload.sellingPrice)
                  : null,
            }
          : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
      include: inventoryItemInclude,
    });
  }

  async deactivate(tenantId: string, itemId: string): Promise<InventoryItemRecord> {
    return prisma.inventoryItem.update({
      where: { id: itemId },
      data: { isActive: false },
      include: inventoryItemInclude,
    });
  }
}

export const inventoryRepository = new InventoryRepository();
