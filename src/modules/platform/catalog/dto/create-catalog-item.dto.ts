export type CatalogProductTypeDto =
  | "MEDICINE"
  | "COSMETIC"
  | "SUPPLEMENT"
  | "MEDICAL_DEVICE"
  | "OTHER";

export type CreateCatalogItemDto = {
  nameEn: string;
  nameAr: string;
  genericNameEn?: string;
  genericNameAr?: string;
  barcode?: string;
  sku?: string;
  category?: string;
  unitOfMeasure: string;
  dosageForm?: string;
  strength?: string;
  manufacturer?: string;
  description?: string;
  scientificName?: string;
  atcCode?: string;
  requiresPrescription?: boolean;
  imageUrl?: string;
  productType?: CatalogProductTypeDto;
};
