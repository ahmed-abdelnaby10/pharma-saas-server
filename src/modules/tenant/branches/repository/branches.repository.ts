import { Prisma } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { CreateBranchDto } from "../dto/create-branch.dto";
import { UpdateBranchDto } from "../dto/update-branch.dto";
import { QueryBranchesDto } from "../dto/query-branch.dto";
import { BranchRecord } from "../mapper/branches.mapper";

export class BranchesRepository {
  async findById(
    tenantId: string,
    branchId: string,
  ): Promise<BranchRecord | null> {
    return prisma.branch.findFirst({
      where: { id: branchId, tenantId },
    });
  }

  async findByNameEn(
    tenantId: string,
    nameEn: string,
  ): Promise<BranchRecord | null> {
    return prisma.branch.findUnique({
      where: { tenantId_nameEn: { tenantId, nameEn } },
    });
  }

  async findByNameAr(
    tenantId: string,
    nameAr: string,
  ): Promise<BranchRecord | null> {
    return prisma.branch.findUnique({
      where: { tenantId_nameAr: { tenantId, nameAr } },
    });
  }

  async countActive(tenantId: string): Promise<number> {
    return prisma.branch.count({
      where: { tenantId, isActive: true },
    });
  }

  async list(
    tenantId: string,
    query: QueryBranchesDto,
  ): Promise<BranchRecord[]> {
    return prisma.branch.findMany({
      where: {
        tenantId,
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }

  async create(tenantId: string, payload: CreateBranchDto): Promise<BranchRecord> {
    return prisma.branch.create({
      data: {
        tenantId,
        nameEn: payload.nameEn,
        nameAr: payload.nameAr,
        address: payload.address ?? null,
        phone: payload.phone ?? null,
        email: payload.email ?? null,
        isActive: payload.isActive,
        isDefault: payload.isDefault,
      },
    });
  }

  /**
   * Create branch as default — unsets any existing default in one transaction.
   */
  async createAsDefaultWithTransaction(
    tenantId: string,
    payload: CreateBranchDto,
  ): Promise<BranchRecord> {
    return prisma.$transaction(async (tx) => {
      await tx.branch.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
      return tx.branch.create({
        data: {
          tenantId,
          nameEn: payload.nameEn,
          nameAr: payload.nameAr,
          address: payload.address ?? null,
          phone: payload.phone ?? null,
          email: payload.email ?? null,
          isActive: payload.isActive,
          isDefault: true,
        },
      });
    });
  }

  async update(
    tenantId: string,
    branchId: string,
    payload: UpdateBranchDto,
  ): Promise<BranchRecord> {
    const data: Prisma.BranchUncheckedUpdateInput = {};

    if (payload.nameEn !== undefined)   data.nameEn   = payload.nameEn;
    if (payload.nameAr !== undefined)   data.nameAr   = payload.nameAr;
    if ("address" in payload)           data.address  = payload.address ?? null;
    if ("phone" in payload)             data.phone    = payload.phone   ?? null;
    if ("email" in payload)             data.email    = payload.email   ?? null;
    if (payload.isActive !== undefined) data.isActive = payload.isActive;
    if (payload.isDefault !== undefined) data.isDefault = payload.isDefault;

    return prisma.branch.update({
      where: { id: branchId, tenantId },
      data,
    });
  }

  /**
   * Set this branch as default — unsets any existing default in one transaction.
   */
  async setDefaultWithTransaction(
    tenantId: string,
    branchId: string,
    payload: UpdateBranchDto,
  ): Promise<BranchRecord> {
    return prisma.$transaction(async (tx) => {
      await tx.branch.updateMany({
        where: { tenantId, isDefault: true, id: { not: branchId } },
        data: { isDefault: false },
      });

      const data: Prisma.BranchUncheckedUpdateInput = { isDefault: true };
      if (payload.nameEn !== undefined)   data.nameEn   = payload.nameEn;
      if (payload.nameAr !== undefined)   data.nameAr   = payload.nameAr;
      if ("address" in payload)           data.address  = payload.address ?? null;
      if ("phone" in payload)             data.phone    = payload.phone   ?? null;
      if ("email" in payload)             data.email    = payload.email   ?? null;
      if (payload.isActive !== undefined) data.isActive = payload.isActive;

      return tx.branch.update({
        where: { id: branchId, tenantId },
        data,
      });
    });
  }

  async deactivate(
    tenantId: string,
    branchId: string,
  ): Promise<BranchRecord> {
    return prisma.branch.update({
      where: { id: branchId, tenantId },
      data: { isActive: false, isDefault: false },
    });
  }

  /**
   * Deactivate a branch that is currently the default.
   * Within the same transaction, promote the next active branch (oldest by
   * createdAt) to default. If no other active branch exists, the tenant is
   * left with no default (edge-case: single branch).
   */
  async deactivateAndPromoteNextDefault(
    tenantId: string,
    branchId: string,
  ): Promise<BranchRecord> {
    return prisma.$transaction(async (tx) => {
      // Find the oldest active branch that is not the one being removed
      const next = await tx.branch.findFirst({
        where: {
          tenantId,
          isActive: true,
          id: { not: branchId },
        },
        orderBy: { createdAt: "asc" },
      });

      // Promote it first (if any) so the tenant is never left without a default
      if (next) {
        await tx.branch.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }

      // Deactivate the outgoing default branch
      return tx.branch.update({
        where: { id: branchId, tenantId },
        data: { isActive: false, isDefault: false },
      });
    });
  }
}

export const branchesRepository = new BranchesRepository();
