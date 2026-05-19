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
import {
  barcodeLookupService,
  BarcodeLookupService,
} from "./barcode-lookup.service";

export interface BarcodeLookupOutcome {
  /** Where the item came from in this request */
  origin:    "existing" | "external_provider" | "not_found";
  /** Provider name when origin === "external_provider" */
  provider?: "openfda" | "openbeauty" | "gs1";
  /** The catalog item — present unless origin === "not_found" */
  item:      CatalogItemRecord | null;
}

export class TenantCatalogService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly barcodeLookup: BarcodeLookupService,
  ) {}

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

  /**
   * POS / receiving-side barcode lookup.
   *
   * Flow:
   *   1. If the catalog already has this barcode → return it (origin: existing)
   *   2. Otherwise, call external providers (OpenFDA → Open Beauty Facts → GS1)
   *      - If any hit, auto-create a PENDING_REVIEW catalog item populated
   *        from the provider response and return it (origin: external_provider)
   *   3. Otherwise return { origin: "not_found", item: null } — the caller
   *      should fall back to the manual `POST /tenant/catalog/suggest` form.
   *
   * This is what makes barcoded cashier scans grow the global catalog over
   * time without manual data entry.
   */
  async lookupByBarcode(
    auth: TenantAuthContext,
    barcode: string,
  ): Promise<BarcodeLookupOutcome> {
    // 1. Existing row in our DB
    const existing = await this.repository.findByBarcode(barcode);
    if (existing) {
      return { origin: "existing", item: existing };
    }

    // 2. External providers
    const hit = await this.barcodeLookup.lookup(barcode);
    if (!hit) {
      return { origin: "not_found", item: null };
    }

    // Auto-suggest a PENDING_REVIEW row populated from the provider response.
    // suggestFromTenant dedupes on barcode, so concurrent scans of the same
    // code from two terminals settle to a single row.
    const { record } = await this.repository.suggestFromTenant({
      submittedByTenantId:  auth.tenantId,
      nameEn:               hit.nameEn,
      nameAr:               hit.nameAr ?? hit.nameEn,
      barcode,
      genericNameEn:        hit.genericNameEn ?? null,
      manufacturer:         hit.manufacturer  ?? null,
      dosageForm:           hit.dosageForm    ?? null,
      strength:             hit.strength      ?? null,
      category:             hit.category      ?? null,
      productType:          hit.productType,
      requiresPrescription: hit.requiresPrescription ?? false,
    });

    return {
      origin:   "external_provider",
      provider: hit.provider,
      item:     record,
    };
  }
}

export const tenantCatalogService = new TenantCatalogService(
  catalogRepository,
  barcodeLookupService,
);
