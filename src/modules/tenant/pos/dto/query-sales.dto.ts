import { SaleStatus } from "@prisma/client";

export interface QuerySalesDto {
  branchId: string;
  shiftId?: string;
  status?: SaleStatus;
  from?: Date;
  to?: Date;
}
