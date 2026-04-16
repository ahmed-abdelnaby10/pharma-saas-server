import { PreferredLanguage, TenantStatus } from "@prisma/client";

export type UpdateTenantDto = {
  nameEn?: string;
  nameAr?: string;
  preferredLanguage?: PreferredLanguage;
  status?: TenantStatus;
};
