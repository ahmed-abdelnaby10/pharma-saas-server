export interface OpenShiftDto {
  branchId: string;
  openingBalance: number;
  notes?: string | null;
  /** Client-generated sync ID for data-level idempotency. */
  externalId?: string | null;
  /** When the shift was opened on the desktop (offline timestamp). */
  clientCreatedAt?: string | null;
}
