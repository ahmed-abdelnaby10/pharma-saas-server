export interface CreatePurchaseOrderDto {
  branchId: string;
  supplierId?: string | null;
  orderNumber?: string;
  notes?: string | null;
  expectedAt?: string | null;
  /** Client-generated SQLite primary key for offline desktop reconciliation (data-level dedup). */
  externalId?: string | null;
}
