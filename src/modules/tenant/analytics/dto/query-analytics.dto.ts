export type TrendGranularity = "day" | "week";

export interface TopItemsQueryDto {
  branchId: string;
  from: Date;
  to: Date;
  limit: number; // 1–50, default 10
}

export interface RevenueTrendQueryDto {
  branchId: string;
  from: Date;
  to: Date;
  granularity: TrendGranularity;
}

export interface PaymentMethodsQueryDto {
  branchId: string;
  from: Date;
  to: Date;
}
