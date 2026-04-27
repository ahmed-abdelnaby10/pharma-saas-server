export interface QueryLowStockDto {
  branchId: string;
}

export interface QueryExpiringDto {
  branchId: string;
  days: number; // look-ahead window in days (default 30)
}

export interface QueryAllAlertsDto {
  branchId: string;
  days: number; // expiry look-ahead window (default 30)
}
