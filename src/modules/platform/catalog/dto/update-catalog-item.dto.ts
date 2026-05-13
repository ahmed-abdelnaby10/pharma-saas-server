import { CatalogProductTypeDto } from "./create-catalog-item.dto";

export type UpdateCatalogItemDto = {
  nameEn?: string;
  nameAr?: string;
  genericNameEn?: string | null;
  genericNameAr?: string | null;
  barcode?: string | null;
  sku?: string | null;
  category?: string | null;
  unitOfMeasure?: string;
  dosageForm?: string | null;
  strength?: string | null;
  manufacturer?: string | null;
  description?: string | null;
  scientificName?: string | null;
  atcCode?: string | null;
  requiresPrescription?: boolean;
  imageUrl?: string | null;
  productType?: CatalogProductTypeDto;
  isActive?: boolean;
};
