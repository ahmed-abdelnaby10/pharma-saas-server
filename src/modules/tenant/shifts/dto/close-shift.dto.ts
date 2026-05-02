export interface CloseShiftDto {
  closingBalance: number;
  notes?: string | null;
  /** When the shift was closed on the desktop (offline timestamp). */
  clientClosedAt?: string | null;
}
