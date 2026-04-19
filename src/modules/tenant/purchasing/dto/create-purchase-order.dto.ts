export interface CreatePurchaseOrderDto {
  branchId: string;
  supplierId?: string | null;
  orderNumber?: string;
  notes?: string | null;
  expectedAt?: string | null;
}
