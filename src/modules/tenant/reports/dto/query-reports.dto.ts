export interface ShiftSummaryQueryDto {
  shiftId: string;
}

export interface DailySalesQueryDto {
  branchId: string;
  from: Date;
  to: Date;
}

export interface StockValuationQueryDto {
  branchId: string;
}
