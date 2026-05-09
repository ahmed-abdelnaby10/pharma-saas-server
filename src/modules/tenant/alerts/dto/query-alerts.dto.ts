export interface QueryLowStockDto {
  branchId: string;
}

export interface QueryExpiringDto {
  branchId: string;
  /** Look-ahead window in days. Omit to use tenant's expiryAlertWindowDays setting. */
  days?: number;
}

export interface QueryAllAlertsDto {
  branchId: string;
  /** Expiry look-ahead window in days. Omit to use tenant's expiryAlertWindowDays setting. */
  days?: number;
}
