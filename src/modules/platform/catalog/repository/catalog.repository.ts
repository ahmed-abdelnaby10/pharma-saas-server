import { CatalogItemStatus, CatalogSource, Prisma } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { CreateCatalogItemDto } from "../dto/create-catalog-item.dto";
import { UpdateCatalogItemDto } from "../dto/update-catalog-item.dto";
import { QueryCatalogDto } from "../dto/query-catalog.dto";
import { CatalogItemRecord } from "../mapper/catalog.mapper";

// Shape used by the sync service to upsert items from external sources
export type UpsertCatalogItemPayload = {
  sourceId:             string;
  source:               CatalogSource;
  nameEn:               string;
  nameAr:               string;
  genericNameEn?:       string | null;
  genericNameAr?:       string | null;
  barcode?:             string | null;
  sku?:                 string | null;
  category?:            string | null;
  unitOfMeasure?:       string;
  dosageForm?:          string | null;
  strength?:            string | null;
  manufacturer?:        string | null;
  description?:         string | null;
  scientificName?:      string | null;
  atcCode?:             string | null;
  requiresPrescription?: boolean;
  imageUrl?:            string | null;
  productType?:         "MEDICINE" | "COSMETIC" | "SUPPLEMENT" | "MEDICAL_DEVICE" | "OTHER";
  isActive?:            boolean;
};

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

  async findBySourceId(sourceId: string): Promise<CatalogItemRecord | null> {
    return prisma.catalogItem.findUnique({ where: { sourceId } });
  }

  async list(query: QueryCatalogDto): Promise<CatalogItemRecord[]> {
    return prisma.catalogItem.findMany({
      where: {
        ...(query.isActive  !== undefined ? { isActive:    query.isActive    } : {}),
        ...(query.status    !== undefined ? { status:      query.status      } : {}),
        ...(query.productType            ? { productType: query.productType  } : {}),
        ...(query.source                 ? { source:      query.source as CatalogSource } : {}),
        ...(query.category               ? { category:    query.category     } : {}),
        ...(query.search
          ? {
              OR: [
                { nameEn:        { contains: query.search, mode: "insensitive" } },
                { nameAr:        { contains: query.search, mode: "insensitive" } },
                { genericNameEn: { contains: query.search, mode: "insensitive" } },
                { genericNameAr: { contains: query.search, mode: "insensitive" } },
                { barcode:       { contains: query.search, mode: "insensitive" } },
                { sku:           { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ nameEn: "asc" }],
    });
  }

  async listPending(): Promise<CatalogItemRecord[]> {
    return prisma.catalogItem.findMany({
      where:   { status: CatalogItemStatus.PENDING_REVIEW },
      orderBy: [{ createdAt: "asc" }],
    });
  }

  async create(
    payload: CreateCatalogItemDto & { status?: CatalogItemStatus },
  ): Promise<CatalogItemRecord> {
    return prisma.catalogItem.create({ data: payload });
  }

  async update(
    itemId: string,
    payload: UpdateCatalogItemDto,
  ): Promise<CatalogItemRecord> {
    return prisma.catalogItem.update({
      where: { id: itemId },
      data:  payload,
    });
  }

  async approve(itemId: string, adminId: string): Promise<CatalogItemRecord> {
    return prisma.catalogItem.update({
      where: { id: itemId },
      data: {
        status:      CatalogItemStatus.ACTIVE,
        verifiedAt:  new Date(),
        verifiedById: adminId,
      },
    });
  }

  async reject(
    itemId: string,
    adminId: string,
    reason?: string,
  ): Promise<CatalogItemRecord> {
    return prisma.catalogItem.update({
      where: { id: itemId },
      data: {
        status:      CatalogItemStatus.REJECTED,
        verifiedAt:  new Date(),
        verifiedById: adminId,
        // store rejection reason in description if provided and field is empty
        ...(reason ? { description: reason } : {}),
      },
    });
  }

  async deactivate(itemId: string): Promise<CatalogItemRecord> {
    return prisma.catalogItem.update({
      where: { id: itemId },
      data:  { isActive: false },
    });
  }

  /** Upsert from external sync source. Matches on sourceId. */
  async upsertFromSource(payload: UpsertCatalogItemPayload): Promise<{
    record: CatalogItemRecord;
    wasCreated: boolean;
  }> {
    const existing = await this.findBySourceId(payload.sourceId);

    const data = {
      nameEn:               payload.nameEn,
      nameAr:               payload.nameAr,
      genericNameEn:        payload.genericNameEn  ?? null,
      genericNameAr:        payload.genericNameAr  ?? null,
      barcode:              payload.barcode         ?? null,
      sku:                  payload.sku             ?? null,
      category:             payload.category        ?? null,
      unitOfMeasure:        payload.unitOfMeasure   ?? "unit",
      dosageForm:           payload.dosageForm      ?? null,
      strength:             payload.strength        ?? null,
      manufacturer:         payload.manufacturer    ?? null,
      description:          payload.description     ?? null,
      scientificName:       payload.scientificName  ?? null,
      atcCode:              payload.atcCode         ?? null,
      requiresPrescription: payload.requiresPrescription ?? false,
      imageUrl:             payload.imageUrl        ?? null,
      productType:          payload.productType     ?? "MEDICINE",
      isActive:             payload.isActive        ?? true,
      source:               payload.source,
      sourceId:             payload.sourceId,
      lastSyncedAt:         new Date(),
      status:               CatalogItemStatus.ACTIVE,
    } satisfies Prisma.CatalogItemUncheckedCreateInput;

    if (existing) {
      const record = await prisma.catalogItem.update({
        where: { id: existing.id },
        data,
      });
      return { record, wasCreated: false };
    }

    const record = await prisma.catalogItem.create({ data });
    return { record, wasCreated: true };
  }

  /**
   * Suggest a new item from a tenant (crowdsource path).
   * If the barcode already exists returns the existing item (idempotent).
   */
  async suggestFromTenant(payload: {
    nameEn:               string;
    nameAr:               string;
    barcode?:             string | null;
    genericNameEn?:       string | null;
    genericNameAr?:       string | null;
    category?:            string | null;
    unitOfMeasure?:       string;
    dosageForm?:          string | null;
    strength?:            string | null;
    manufacturer?:        string | null;
    requiresPrescription?: boolean;
    productType?:         "MEDICINE" | "COSMETIC" | "SUPPLEMENT" | "MEDICAL_DEVICE" | "OTHER";
    submittedByTenantId:  string;
  }): Promise<{ record: CatalogItemRecord; wasCreated: boolean }> {
    // Check by barcode first (dedup)
    if (payload.barcode) {
      const byBarcode = await this.findByBarcode(payload.barcode);
      if (byBarcode) return { record: byBarcode, wasCreated: false };
    }

    const record = await prisma.catalogItem.create({
      data: {
        nameEn:               payload.nameEn,
        nameAr:               payload.nameAr,
        genericNameEn:        payload.genericNameEn  ?? null,
        genericNameAr:        payload.genericNameAr  ?? null,
        barcode:              payload.barcode         ?? null,
        category:             payload.category        ?? null,
        unitOfMeasure:        payload.unitOfMeasure   ?? "unit",
        dosageForm:           payload.dosageForm      ?? null,
        strength:             payload.strength        ?? null,
        manufacturer:         payload.manufacturer    ?? null,
        requiresPrescription: payload.requiresPrescription ?? false,
        productType:          payload.productType ?? "MEDICINE",
        source:               "TENANT",
        status:               CatalogItemStatus.PENDING_REVIEW,
        submittedByTenantId:  payload.submittedByTenantId,
      },
    });
    return { record, wasCreated: true };
  }
}

export const catalogRepository = new CatalogRepository();
