import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import {
  subscriptionsRepository,
} from "../../../platform/subscriptions/repository/subscriptions.repository";
import { CreateBranchDto } from "../dto/create-branch.dto";
import { UpdateBranchDto } from "../dto/update-branch.dto";
import { QueryBranchesDto } from "../dto/query-branch.dto";
import { BranchRecord } from "../mapper/branches.mapper";
import { branchesRepository } from "../repository/branches.repository";

const MAX_BRANCHES_FEATURE_KEY = "max_branches";

export class BranchesService {
  /**
   * Enforce plan-level branch limit.
   * Throws ForbiddenError if the tenant has reached the max_branches limit
   * defined on their active subscription's plan features.
   */
  private async enforceLimit(tenantId: string): Promise<void> {
    const subscription =
      await subscriptionsRepository.findCurrentWithPlanFeaturesByTenant(tenantId);

    if (!subscription) {
      throw new ForbiddenError(
        "No active subscription found",
        undefined,
        "subscription.not_found",
      );
    }

    const feature = subscription.plan.features?.find(
      (f) => f.featureKey === MAX_BRANCHES_FEATURE_KEY && f.enabled,
    );

    if (feature && feature.limitValue !== null) {
      const activeCount = await branchesRepository.countActive(tenantId);
      if (activeCount >= feature.limitValue) {
        throw new ForbiddenError(
          "Branch limit reached for your plan",
          undefined,
          "branch.limit_exceeded",
        );
      }
    }
  }

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
    await this.enforceLimit(auth.tenantId);

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
