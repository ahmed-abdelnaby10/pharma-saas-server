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
};
