import { z } from "zod";
import { CreateTenantDto } from "../dto/create-tenant.dto";
import { UpdateTenantDto } from "../dto/update-tenant.dto";
import { QueryTenantsDto } from "../dto/query-tenant.dto";

const createTenantSchema = z.object({
  nameEn: z.string().trim().min(2).max(120),
  nameAr: z.string().trim().min(2).max(120),
  preferredLanguage: z.enum(["en", "ar"]).default("en"),
  planId: z.string().trim().min(1),
});

const updateTenantSchema = z
  .object({
    nameEn: z.string().trim().min(2).max(120).optional(),
    nameAr: z.string().trim().min(2).max(120).optional(),
    preferredLanguage: z.enum(["en", "ar"]).optional(),
    status: z.enum(["active", "suspended", "inactive"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const queryTenantsSchema = z.object({
  search: z.string().trim().min(1).optional(),
  status: z.enum(["active", "suspended", "inactive"]).optional(),
});

const tenantIdParamSchema = z.object({
  tenantId: z.string().trim().min(1),
});

export const parseCreateTenantDto = (input: unknown): CreateTenantDto => {
  return createTenantSchema.parse(input) as CreateTenantDto;
};

export const parseUpdateTenantDto = (input: unknown): UpdateTenantDto => {
  return updateTenantSchema.parse(input) as UpdateTenantDto;
};

export const parseQueryTenantsDto = (input: unknown): QueryTenantsDto => {
  return queryTenantsSchema.parse(input) as QueryTenantsDto;
};

export const parseTenantIdParam = (input: unknown): string => {
  return tenantIdParamSchema.parse(input).tenantId;
};
