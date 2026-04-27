import { Prisma, ShiftStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { QueryShiftsDto } from "../dto/query-shifts.dto";
import { ShiftRecord } from "../mapper/shifts.mapper";

const shiftInclude = {
  user: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.ShiftInclude;

export class ShiftsRepository {
  async list(tenantId: string, query: QueryShiftsDto): Promise<ShiftRecord[]> {
    return prisma.shift.findMany({
      where: {
        tenantId,
        branchId: query.branchId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
      },
      include: shiftInclude,
      orderBy: [{ openedAt: "desc" }],
    });
  }

  async findById(tenantId: string, shiftId: string): Promise<ShiftRecord | null> {
    return prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
      include: shiftInclude,
    });
  }

  async findActiveByBranch(tenantId: string, branchId: string): Promise<ShiftRecord | null> {
    return prisma.shift.findFirst({
      where: { tenantId, branchId, status: ShiftStatus.OPEN },
      include: shiftInclude,
    });
  }

  /**
   * Offline sync: look up a Shift by the client-generated externalId.
   * Used for data-level idempotency — if the record already exists we return
   * it instead of creating a duplicate, even if the Redis cache has expired.
   */
  async findByExternalId(
    tenantId: string,
    externalId: string,
  ): Promise<ShiftRecord | null> {
    return prisma.shift.findUnique({
      where: { tenantId_externalId: { tenantId, externalId } },
      include: shiftInclude,
    });
  }

  async create(data: {
    tenantId: string;
    branchId: string;
    userId: string;
    openingBalance: Prisma.Decimal;
    notes?: string | null;
    externalId?: string | null;
    clientCreatedAt?: Date | null;
  }): Promise<ShiftRecord> {
    return prisma.shift.create({
      data: {
        tenantId: data.tenantId,
        branchId: data.branchId,
        userId: data.userId,
        openingBalance: data.openingBalance,
        ...(data.notes != null ? { notes: data.notes } : {}),
        ...(data.externalId != null ? { externalId: data.externalId } : {}),
        ...(data.clientCreatedAt != null ? { clientCreatedAt: data.clientCreatedAt } : {}),
      },
      include: shiftInclude,
    });
  }

  async close(
    shiftId: string,
    closingBalance: Prisma.Decimal,
    notes?: string | null,
    clientClosedAt?: Date | null,
  ): Promise<ShiftRecord> {
    return prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.CLOSED,
        closingBalance,
        closedAt: new Date(),
        ...(notes !== undefined ? { notes } : {}),
        ...(clientClosedAt != null ? { clientClosedAt } : {}),
      },
      include: shiftInclude,
    });
  }
}

export const shiftsRepository = new ShiftsRepository();
