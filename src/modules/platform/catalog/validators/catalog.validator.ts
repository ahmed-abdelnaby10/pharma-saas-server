import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";

const PRODUCT_TYPES = ["MEDICINE", "COSMETIC", "SUPPLEMENT", "MEDICAL_DEVICE", "OTHER"] as const;
const CATALOG_STATUSES = ["PENDING_REVIEW", "ACTIVE", "REJECTED"] as const;
const CATALOG_SOURCES  = ["MANUAL", "OPENFDA", "OPENBEAUTY", "EDA", "TENANT"] as const;

const str = (min = 1, max = 255) => z.string().min(min).max(max);
const optStr = (min = 1, max = 255) => str(min, max).optional();
const nullableStr = (min = 1, max = 255) => str(min, max).nullable().optional();

const createSchema = z.object({
  nameEn:               str(2, 255),
  nameAr:               str(2, 255),
  genericNameEn:        optStr(2, 255),
  genericNameAr:        optStr(2, 255),
  barcode:              optStr(1, 100),
  sku:                  optStr(1, 100),
  category:             optStr(2, 100),
  unitOfMeasure:        str(1, 64),
  dosageForm:           optStr(2, 100),
  strength:             optStr(1, 64),
  manufacturer:         optStr(2, 255),
  description:          optStr(1, 2000),
  scientificName:       optStr(2, 255),
  atcCode:              optStr(1, 20),
  requiresPrescription: z.boolean().optional(),
  imageUrl:             z.string().url().optional(),
  productType:          z.enum(PRODUCT_TYPES).optional(),
});

const updateSchema = z
  .object({
    nameEn:               optStr(2, 255),
    nameAr:               optStr(2, 255),
    genericNameEn:        nullableStr(2, 255),
    genericNameAr:        nullableStr(2, 255),
    barcode:              nullableStr(1, 100),
    sku:                  nullableStr(1, 100),
    category:             nullableStr(2, 100),
    unitOfMeasure:        optStr(1, 64),
    dosageForm:           nullableStr(2, 100),
    strength:             nullableStr(1, 64),
    manufacturer:         nullableStr(2, 255),
    description:          nullableStr(1, 2000),
    scientificName:       nullableStr(2, 255),
    atcCode:              nullableStr(1, 20),
    requiresPrescription: z.boolean().optional(),
    imageUrl:             z.string().url().nullable().optional(),
    productType:          z.enum(PRODUCT_TYPES).optional(),
    isActive:             z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided",
  });

const querySchema = z.object({
  search:      z.string().min(1).max(100).optional(),
  category:    z.string().min(1).max(100).optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "true")  return true;
      if (v === "false") return false;
      return undefined;
    }),
  status:      z.enum(CATALOG_STATUSES).optional(),
  productType: z.enum(PRODUCT_TYPES).optional(),
  source:      z.enum(CATALOG_SOURCES).optional(),
});

const itemIdParamSchema = z.object({
  itemId: z.string().cuid("Invalid catalog item ID"),
});

const approveRejectSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseCreateCatalogItemDto  = (body: unknown)   => parse(createSchema, body);
export const parseUpdateCatalogItemDto  = (body: unknown)   => parse(updateSchema, body);
export const parseQueryCatalogDto       = (query: unknown)  => parse(querySchema, query);
export const parseCatalogItemIdParam    = (params: unknown): string => parse(itemIdParamSchema, params).itemId;
export const parseApproveRejectDto      = (body: unknown)   => parse(approveRejectSchema, body);
