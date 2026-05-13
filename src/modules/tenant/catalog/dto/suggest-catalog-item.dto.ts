export type SuggestCatalogItemDto = {
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
};
