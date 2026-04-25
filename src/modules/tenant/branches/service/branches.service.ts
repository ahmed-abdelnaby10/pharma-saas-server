import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { usageLimitService } from "../../../../core/usage/usage-limit.service";
import { FeatureKey } from "../../../../shared/constants/feature-keys";
import { CreateBranchDto } from "../dto/create-branch.dto";
import { UpdateBranchDto } from "../dto/update-branch.dto";
import { QueryBranchesDto } from "../dto/query-branch.dto";
import { BranchRecord } from "../mapper/branches.mapper";
import { branchesRepository } from "../repository/branches.repository";

export class BranchesService {

  async listBranches(
    auth: TenantAuthContext,
    query: QueryBranchesDto,
  ): Promise<BranchRecord[]> {
    return branchesRepository.list(auth.tenantId, query);
  }

  async getBranch(
    auth: TenantAuthContext,
    branchId: string,
  ): Promise<BranchRecord> {
    const branch = await branchesRepository.findById(auth.tenantId, branchId);
    if (!branch) {
      throw new NotFoundError("Branch not found", undefined, "branch.not_found");
    }
    return branch;
  }

  async createBranch(
    auth: TenantAuthContext,
    payload: CreateBranchDto,
  ): Promise<BranchRecord> {
    const activeCount = await branchesRepository.countActive(auth.tenantId);
    await usageLimitService.assertCountUnderLimit(
      auth.tenantId,
      FeatureKey.MAX_BRANCHES,
      activeCount,
    );

    const [existingEn, existingAr] = await Promise.all([
      branchesRepository.findByNameEn(auth.tenantId, payload.nameEn),
      branchesRepository.findByNameAr(auth.tenantId, payload.nameAr),
    ]);

    if (existingEn || existingAr) {
      throw new ConflictError(
        "Branch name already exists",
        undefined,
        "branch.name_conflict",
      );
    }

    if (payload.isDefault) {
      return branchesRepository.createAsDefaultWithTransaction(
        auth.tenantId,
        payload,
      );
    }

    return branchesRepository.create(auth.tenantId, payload);
  }

  async updateBranch(
    auth: TenantAuthContext,
    branchId: string,
    payload: UpdateBranchDto,
  ): Promise<BranchRecord> {
    const branch = await branchesRepository.findById(auth.tenantId, branchId);
    if (!branch) {
      throw new NotFoundError("Branch not found", undefined, "branch.not_found");
    }

    if (payload.nameEn !== undefined && payload.nameEn !== branch.nameEn) {
      const conflict = await branchesRepository.findByNameEn(
        auth.tenantId,
        payload.nameEn,
      );
      if (conflict) {
        throw new ConflictError(
          "Branch name already exists",
          undefined,
          "branch.name_conflict",
        );
      }
    }

    if (payload.nameAr !== undefined && payload.nameAr !== branch.nameAr) {
      const conflict = await branchesRepository.findByNameAr(
        auth.tenantId,
        payload.nameAr,
      );
      if (conflict) {
        throw new ConflictError(
          "Branch name already exists",
          undefined,
          "branch.name_conflict",
        );
      }
    }

    if (payload.isDefault === true) {
      return branchesRepository.setDefaultWithTransaction(
        auth.tenantId,
        branchId,
        payload,
      );
    }

    return branchesRepository.update(auth.tenantId, branchId, payload);
  }

  async deactivateBranch(
    auth: TenantAuthContext,
    branchId: string,
  ): Promise<BranchRecord> {
    const branch = await branchesRepository.findById(auth.tenantId, branchId);
    if (!branch) {
      throw new NotFoundError("Branch not found", undefined, "branch.not_found");
    }

    if (!branch.isActive) {
      throw new ConflictError(
        "Branch is already inactive",
        undefined,
        "branch.already_inactive",
      );
    }

    return branchesRepository.deactivate(auth.tenantId, branchId);
  }
}

export const branchesService = new BranchesService();
