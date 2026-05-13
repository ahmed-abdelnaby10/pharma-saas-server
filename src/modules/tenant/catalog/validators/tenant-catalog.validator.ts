import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";

const PRODUCT_TYPES = [
  "MEDICINE",
  "COSMETIC",
  "SUPPLEMENT",
  "MEDICAL_DEVICE",
  "OTHER",
] as const;

const str      = (min = 1, max = 255) => z.string().min(min).max(max);
const optStr   = (min = 1, max = 255) => str(min, max).optional();
const nullableStr = (min = 1, max = 255) => str(min, max).nullable().optional();

const suggestSchema = z.object({
  nameEn:               str(2, 255),
  nameAr:               str(2, 255),
  barcode:              nullableStr(1, 100),
  genericNameEn:        nullableStr(2, 255),
  genericNameAr:        nullableStr(2, 255),
  category:             nullableStr(2, 100),
  unitOfMeasure:        optStr(1, 64),
  dosageForm:           nullableStr(2, 100),
  strength:             nullableStr(1, 64),
  manufacturer:         nullableStr(2, 255),
  requiresPrescription: z.boolean().optional(),
  productType:          z.enum(PRODUCT_TYPES).optional(),
});

export const parseSuggestCatalogItemDto = (body: unknown) => {
  const result = suggestSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};
