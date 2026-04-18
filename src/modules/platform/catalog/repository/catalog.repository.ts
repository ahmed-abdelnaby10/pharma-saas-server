import { prisma } from "../../../../core/db/prisma";
import { CreateCatalogItemDto } from "../dto/create-catalog-item.dto";
import { UpdateCatalogItemDto } from "../dto/update-catalog-item.dto";
import { QueryCatalogDto } from "../dto/query-catalog.dto";
import { CatalogItemRecord } from "../mapper/catalog.mapper";

export class CatalogRepository {
  async findById(itemId: string): Promise<CatalogItemRecord | null> {
    return prisma.catalogItem.findUnique({ where: { id: itemId } });
  }

  async findByBarcode(barcode: string): Promise<CatalogItemRecord | null> {
    return prisma.catalogItem.findUnique({ where: { barcode } });
  }

  async findBySku(sku: string): Promise<CatalogItemRecord | null> {
    return prisma.catalogItem.findUnique({ where: { sku } });
  }

  async list(query: QueryCatalogDto): Promise<CatalogItemRecord[]> {
    return prisma.catalogItem.findMany({
      where: {
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.search
          ? {
              OR: [
                { nameEn: { contains: query.search, mode: "insensitive" } },
                { nameAr: { contains: query.search, mode: "insensitive" } },
                { genericNameEn: { contains: query.search, mode: "insensitive" } },
                { genericNameAr: { contains: query.search, mode: "insensitive" } },
                { barcode: { contains: query.search, mode: "insensitive" } },
                { sku: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ nameEn: "asc" }],
    });
  }

  async create(payload: CreateCatalogItemDto): Promise<CatalogItemRecord> {
    return prisma.catalogItem.create({ data: payload });
  }

  async update(
    itemId: string,
    payload: UpdateCatalogItemDto,
  ): Promise<CatalogItemRecord> {
    return prisma.catalogItem.update({
      where: { id: itemId },
      data: payload,
    });
  }

  async deactivate(itemId: string): Promise<CatalogItemRecord> {
    return prisma.catalogItem.update({
      where: { id: itemId },
      data: { isActive: false },
    });
  }
}

export const catalogRepository = new CatalogRepository();
