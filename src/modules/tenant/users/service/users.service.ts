import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { hashPassword } from "../../../../core/security/password";
import { usageLimitService } from "../../../../core/usage/usage-limit.service";
import { FeatureKey } from "../../../../shared/constants/feature-keys";
import { branchesRepository } from "../../branches/repository/branches.repository";
import { CreateUserDto } from "../dto/create-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import { QueryUsersDto } from "../dto/query-users.dto";
import { UserRecord } from "../mapper/users.mapper";
import { usersRepository } from "../repository/users.repository";

export class UsersService {
  /**
   * Validate that the given branchId belongs to the tenant and is active.
   */
  private async validateBranch(
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await branchesRepository.findById(tenantId, branchId);
    if (!branch) {
      throw new BadRequestError("Branch not found or does not belong to this tenant");
    }
    if (!branch.isActive) {
      throw new BadRequestError("Cannot assign user to an inactive branch");
    }
  }

  async listUsers(
    auth: TenantAuthContext,
    query: QueryUsersDto,
  ): Promise<UserRecord[]> {
    return usersRepository.list(auth.tenantId, query);
  }

  async getUser(auth: TenantAuthContext, userId: string): Promise<UserRecord> {
    const user = await usersRepository.findById(auth.tenantId, userId);
    if (!user) {
      throw new NotFoundError("User not found", undefined, "user.not_found");
    }
    return user;
  }

  async createUser(
    auth: TenantAuthContext,
    payload: CreateUserDto,
  ): Promise<UserRecord> {
    const activeCount = await usersRepository.countActive(auth.tenantId);
    await usageLimitService.assertCountUnderLimit(
      auth.tenantId,
      FeatureKey.MAX_USERS,
      activeCount,
    );

    const existing = await usersRepository.findByEmail(
      auth.tenantId,
      payload.email,
    );
    if (existing) {
      throw new ConflictError(
        "A user with this email already exists",
        undefined,
        "user.email_conflict",
      );
    }

    if (payload.branchId) {
      await this.validateBranch(auth.tenantId, payload.branchId);
    }

    const passwordHash = await hashPassword(payload.password);

    return usersRepository.create({
      tenantId: auth.tenantId,
      email: payload.email,
      passwordHash,
      fullName: payload.fullName,
      branchId: payload.branchId,
      preferredLanguage: payload.preferredLanguage,
    });
  }

  async updateUser(
    auth: TenantAuthContext,
    userId: string,
    payload: UpdateUserDto,
  ): Promise<UserRecord> {
    const user = await usersRepository.findById(auth.tenantId, userId);
    if (!user) {
      throw new NotFoundError("User not found", undefined, "user.not_found");
    }

    if (payload.branchId) {
      await this.validateBranch(auth.tenantId, payload.branchId);
    }

    const passwordHash = payload.password
      ? await hashPassword(payload.password)
      : undefined;

    return usersRepository.update(auth.tenantId, userId, {
      fullName: payload.fullName,
      passwordHash,
      branchId: payload.branchId,
      preferredLanguage: payload.preferredLanguage,
    });
  }

  async deactivateUser(
    auth: TenantAuthContext,
    userId: string,
  ): Promise<UserRecord> {
    const user = await usersRepository.findById(auth.tenantId, userId);
    if (!user) {
      throw new NotFoundError("User not found", undefined, "user.not_found");
    }
    if (!user.isActive) {
      throw new ConflictError(
        "User is already inactive",
        undefined,
        "user.already_inactive",
      );
    }
    return usersRepository.deactivate(auth.tenantId, userId);
  }
}

export const usersService = new UsersService();
