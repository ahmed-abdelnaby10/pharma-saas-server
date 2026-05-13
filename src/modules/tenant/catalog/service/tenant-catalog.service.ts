/**
 * TenantCatalogService
 *
 * Handles the tenant-facing catalog operations:
 *   - List: returns ACTIVE items + the tenant's own PENDING_REVIEW suggestions
 *   - Suggest: crowdsource a new item (deduplicated by barcode)
 *
 * All writes are scoped to the authenticated tenantId.
 */
import { CatalogItemStatus } from "@prisma/client";
import { TenantAuthContext } from "../../../../shared/types/auth.types";
import {
  catalogRepository,
  CatalogRepository,
} from "../../../platform/catalog/repository/catalog.repository";
import { CatalogItemRecord } from "../../../platform/catalog/mapper/catalog.mapper";
import { SuggestCatalogItemDto } from "../dto/suggest-catalog-item.dto";
import { prisma } from "../../../../core/db/prisma";

export class TenantCatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  /**
   * Return all ACTIVE catalog items + the calling tenant's own PENDING_REVIEW items.
   * Tenants never see other tenants' suggestions, and never see REJECTED items.
   */
  async listItems(
    auth: TenantAuthContext,
    search?: string,
  ): Promise<CatalogItemRecord[]> {
    return prisma.catalogItem.findMany({
      where: {
        OR: [
          { status: CatalogItemStatus.ACTIVE },
          {
            status:             CatalogItemStatus.PENDING_REVIEW,
            submittedByTenantId: auth.tenantId,
          },
        ],
        ...(search
          ? {
              AND: [
                {
                  OR: [
                    { nameEn:        { contains: search, mode: "insensitive" } },
                    { nameAr:        { contains: search, mode: "insensitive" } },
                    { genericNameEn: { contains: search, mode: "insensitive" } },
                    { genericNameAr: { contains: search, mode: "insensitive" } },
                    { barcode:       { contains: search, mode: "insensitive" } },
                    { sku:           { contains: search, mode: "insensitive" } },
                  ],
                },
              ],
            }
          : {}),
      },
      orderBy: [{ nameEn: "asc" }],
    });
  }

  /**
   * Suggest a new catalog item.
   * - If a barcode match already exists (any status), returns it — idempotent.
   * - Otherwise creates a PENDING_REVIEW item attributed to this tenant.
   */
  async suggestItem(
    auth: TenantAuthContext,
    payload: SuggestCatalogItemDto,
  ): Promise<{ record: CatalogItemRecord; wasCreated: boolean }> {
    return this.repository.suggestFromTenant({
      ...payload,
      submittedByTenantId: auth.tenantId,
    });
  }

  /**
   * Convenience method used by the purchasing flow:
   * looks up a catalog item by barcode; if not found, auto-suggests it.
   * Returns the existing or newly-created item.
   */
  async findOrSuggest(
    auth: TenantAuthContext,
    payload: SuggestCatalogItemDto & { barcode: string },
  ): Promise<CatalogItemRecord> {
    const existing = await this.repository.findByBarcode(payload.barcode);
    if (existing) return existing;

    const { record } = await this.repository.suggestFromTenant({
      ...payload,
      submittedByTenantId: auth.tenantId,
    });
    return record;
  }
}

export const tenantCatalogService = new TenantCatalogService(catalogRepository);
