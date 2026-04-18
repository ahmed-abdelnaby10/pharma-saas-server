import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { CreateCatalogItemDto } from "../dto/create-catalog-item.dto";
import { UpdateCatalogItemDto } from "../dto/update-catalog-item.dto";
import { QueryCatalogDto } from "../dto/query-catalog.dto";
import { CatalogItemRecord } from "../mapper/catalog.mapper";
import {
  catalogRepository,
  CatalogRepository,
} from "../repository/catalog.repository";

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async listItems(query: QueryCatalogDto): Promise<CatalogItemRecord[]> {
    return this.repository.list(query);
  }

  async getItem(itemId: string): Promise<CatalogItemRecord> {
    const item = await this.repository.findById(itemId);
    if (!item) {
      throw new NotFoundError(
        "Catalog item not found",
        undefined,
        "catalog.not_found",
      );
    }
    return item;
  }

  async createItem(payload: CreateCatalogItemDto): Promise<CatalogItemRecord> {
    if (payload.barcode) {
      const existing = await this.repository.findByBarcode(payload.barcode);
      if (existing) {
        throw new ConflictError(
          "A catalog item with this barcode already exists",
          undefined,
          "catalog.barcode_conflict",
        );
      }
    }

    if (payload.sku) {
      const existing = await this.repository.findBySku(payload.sku);
      if (existing) {
        throw new ConflictError(
          "A catalog item with this SKU already exists",
          undefined,
          "catalog.sku_conflict",
        );
      }
    }

    return this.repository.create(payload);
  }

  async updateItem(
    itemId: string,
    payload: UpdateCatalogItemDto,
  ): Promise<CatalogItemRecord> {
    const item = await this.repository.findById(itemId);
    if (!item) {
      throw new NotFoundError(
        "Catalog item not found",
        undefined,
        "catalog.not_found",
      );
    }

    if (payload.barcode !== undefined && payload.barcode !== null && payload.barcode !== item.barcode) {
      const conflict = await this.repository.findByBarcode(payload.barcode);
      if (conflict) {
        throw new ConflictError(
          "A catalog item with this barcode already exists",
          undefined,
          "catalog.barcode_conflict",
        );
      }
    }

    if (payload.sku !== undefined && payload.sku !== null && payload.sku !== item.sku) {
      const conflict = await this.repository.findBySku(payload.sku);
      if (conflict) {
        throw new ConflictError(
          "A catalog item with this SKU already exists",
          undefined,
          "catalog.sku_conflict",
        );
      }
    }

    return this.repository.update(itemId, payload);
  }

  async deactivateItem(itemId: string): Promise<CatalogItemRecord> {
    const item = await this.repository.findById(itemId);
    if (!item) {
      throw new NotFoundError(
        "Catalog item not found",
        undefined,
        "catalog.not_found",
      );
    }
    if (!item.isActive) {
      throw new ConflictError(
        "Catalog item is already inactive",
        undefined,
        "catalog.already_inactive",
      );
    }
    return this.repository.deactivate(itemId);
  }
}

export const catalogService = new CatalogService(catalogRepository);
