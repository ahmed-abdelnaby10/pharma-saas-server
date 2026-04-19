import { Shift, ShiftStatus, TenantUser } from "@prisma/client";

export type ShiftWithUser = Shift & {
  user: Pick<TenantUser, "id" | "fullName" | "email">;
};

export type ShiftRecord = ShiftWithUser;

export interface ShiftResponse {
  id: string;
  tenantId: string;
  branchId: string;
  userId: string;
  user: { id: string; fullName: string; email: string };
  status: ShiftStatus;
  openingBalance: string;
  closingBalance: string | null;
  notes: string | null;
  openedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapShiftResponse(shift: ShiftRecord): ShiftResponse {
  return {
    id: shift.id,
    tenantId: shift.tenantId,
    branchId: shift.branchId,
    userId: shift.userId,
    user: {
      id: shift.user.id,
      fullName: shift.user.fullName,
      email: shift.user.email,
    },
    status: shift.status,
    openingBalance: shift.openingBalance.toString(),
    closingBalance: shift.closingBalance ? shift.closingBalance.toString() : null,
    notes: shift.notes,
    openedAt: shift.openedAt,
    closedAt: shift.closedAt,
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
  };
}
