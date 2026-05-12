export type CashAdjustmentTypeDto = "CASH_IN" | "CASH_OUT";

export interface CreateCashAdjustmentDto {
  type:    CashAdjustmentTypeDto;
  amount:  string; // Decimal-safe string, e.g. "1000" or "1000.50"
  reason?: string | null;
}
