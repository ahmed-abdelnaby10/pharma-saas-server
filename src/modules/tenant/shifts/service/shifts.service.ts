import { Prisma } from "@prisma/client";
import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { OpenShiftDto } from "../dto/open-shift.dto";
import { CloseShiftDto } from "../dto/close-shift.dto";
import { QueryShiftsDto } from "../dto/query-shifts.dto";
import { ShiftRecord } from "../mapper/shifts.mapper";
import { shiftsRepository, ShiftsRepository } from "../repository/shifts.repository";
import { prisma } from "../../../../core/db/prisma";

export class ShiftsService {
  constructor(private readonly repository: ShiftsRepository) {}

  async listShifts(auth: TenantAuthContext, query: QueryShiftsDto): Promise<ShiftRecord[]> {
    await this.assertBranch(auth.tenantId, query.branchId);
    return this.repository.list(auth.tenantId, query);
  }

  async getShift(auth: TenantAuthContext, shiftId: string): Promise<ShiftRecord> {
    const shift = await this.repository.findById(auth.tenantId, shiftId);
    if (!shift) throw new NotFoundError("Shift not found", undefined, "shift.not_found");
    return shift;
  }

  async getActiveShift(auth: TenantAuthContext, branchId: string): Promise<ShiftRecord> {
    await this.assertBranch(auth.tenantId, branchId);
    const shift = await this.repository.findActiveByBranch(auth.tenantId, branchId);
    if (!shift) throw new NotFoundError("No open shift at this branch", undefined, "shift.no_active");
    return shift;
  }

  async openShift(auth: TenantAuthContext, payload: OpenShiftDto): Promise<ShiftRecord> {
    await this.assertBranch(auth.tenantId, payload.branchId);

    const existing = await this.repository.findActiveByBranch(auth.tenantId, payload.branchId);
    if (existing) {
      throw new ConflictError(
        "A shift is already open at this branch",
        undefined,
        "shift.already_open",
      );
    }

    return this.repository.create({
      tenantId: auth.tenantId,
      branchId: payload.branchId,
      userId: auth.userId,
      openingBalance: new Prisma.Decimal(payload.openingBalance),
      notes: payload.notes ?? null,
    });
  }

  async closeShift(
    auth: TenantAuthContext,
    shiftId: string,
    payload: CloseShiftDto,
  ): Promise<ShiftRecord> {
    const shift = await this.getShift(auth, shiftId);

    if (shift.status === "CLOSED") {
      throw new ConflictError("Shift is already closed", undefined, "shift.already_closed");
    }

    return this.repository.close(
      shiftId,
      new Prisma.Decimal(payload.closingBalance),
      payload.notes ?? null,
    );
  }

  private async assertBranch(tenantId: string, branchId: string): Promise<void> {
    const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId } });
    if (!branch) throw new ForbiddenError("Branch not found or does not belong to this tenant");
  }
}

export const shiftsService = new ShiftsService(shiftsRepository);
