import { PurchaseOrderStatus } from "@prisma/client";

export interface UpdatePurchaseOrderDto {
  supplierId?: string | null;
  notes?: string | null;
  expectedAt?: string | null;
  status?: PurchaseOrderStatus;
}
