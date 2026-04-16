import { TenantStatus } from "@prisma/client";

export type QueryTenantsDto = {
  search?: string;
  status?: TenantStatus;
};
