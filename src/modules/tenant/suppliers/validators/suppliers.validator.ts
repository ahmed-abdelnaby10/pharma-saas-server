import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";

const createSchema = z.object({
  nameEn: z.string().min(2).max(255),
  nameAr: z.string().min(2).max(255),
  phone: z.string().min(5).max(30).optional(),
  email: z.string().email().max(255).optional(),
  address: z.string().min(2).max(500).optional(),
  taxId: z.string().min(1).max(64).optional(),
  contactName: z.string().min(2).max(120).optional(),
});

const updateSchema = z
  .object({
    nameEn: z.string().min(2).max(255).optional(),
    nameAr: z.string().min(2).max(255).optional(),
    phone: z.string().min(5).max(30).nullable().optional(),
    email: z.string().email().max(255).nullable().optional(),
    address: z.string().min(2).max(500).nullable().optional(),
    taxId: z.string().min(1).max(64).nullable().optional(),
    contactName: z.string().min(2).max(120).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided",
  });

const querySchema = z.object({
  isActive: z
    .string()
    .optional()
    .transform((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      return undefined;
    }),
  search: z.string().min(1).max(100).optional(),
});

const supplierIdParamSchema = z.object({
  supplierId: z.string().cuid("Invalid supplier ID"),
});

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseCreateSupplierDto = (body: unknown) =>
  parse(createSchema, body);
export const parseUpdateSupplierDto = (body: unknown) =>
  parse(updateSchema, body);
export const parseQuerySuppliersDto = (query: unknown) =>
  parse(querySchema, query);
export const parseSupplierIdParam = (params: unknown): string =>
  parse(supplierIdParamSchema, params).supplierId;
