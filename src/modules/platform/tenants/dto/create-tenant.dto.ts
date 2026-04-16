import { PreferredLanguage } from "@prisma/client";

export type CreateTenantDto = {
  nameEn: string;
  nameAr: string;
  preferredLanguage: PreferredLanguage;
  planId: string;
};
