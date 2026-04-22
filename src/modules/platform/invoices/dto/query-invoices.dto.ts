import { PlatformInvoiceStatus } from "@prisma/client";

export interface QueryInvoicesDto {
  tenantId?: string;
  status?: PlatformInvoiceStatus;
}
