import { ShiftStatus } from "@prisma/client";

export interface QueryShiftsDto {
  branchId: string;
  status?: ShiftStatus;
  userId?: string;
}
