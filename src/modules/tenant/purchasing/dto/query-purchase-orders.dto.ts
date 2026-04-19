import { PurchaseOrderStatus } from "@prisma/client";

export interface QueryPurchaseOrdersDto {
  branchId: string;
  status?: PurchaseOrderStatus;
  supplierId?: string;
}
