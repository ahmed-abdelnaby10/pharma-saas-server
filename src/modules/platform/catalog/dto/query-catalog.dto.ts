export type CatalogStatusFilter = "PENDING_REVIEW" | "ACTIVE" | "REJECTED";
export type CatalogProductTypeFilter =
  | "MEDICINE"
  | "COSMETIC"
  | "SUPPLEMENT"
  | "MEDICAL_DEVICE"
  | "OTHER";

export type QueryCatalogDto = {
  search?: string;
  category?: string;
  isActive?: boolean;
  status?: CatalogStatusFilter;
  productType?: CatalogProductTypeFilter;
  source?: string;
};
