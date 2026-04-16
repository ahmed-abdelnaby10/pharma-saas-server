import { z } from "zod";

export const createTenantSchema = z.object({
  nameEn: z.string().min(2).max(120),
  nameAr: z.string().min(2).max(120),
  preferredLanguage: z.enum(["en", "ar"]),
  planId: z.string().min(1),
});

export type CreateTenantDto = z.infer<typeof createTenantSchema>;
