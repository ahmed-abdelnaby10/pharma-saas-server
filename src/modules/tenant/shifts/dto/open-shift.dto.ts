export interface OpenShiftDto {
  branchId: string;
  openingBalance: number;
  notes?: string | null;
  /**
   * Client-generated sync ID from the desktop SQLite store.
   * Used for data-level idempotency: a retry with the same externalId returns
   * the existing Shift rather than creating a duplicate or raising a conflict.
   */
  externalId?: string | null;
}
