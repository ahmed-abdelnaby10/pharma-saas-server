import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { permissionsRepository } from "../../permissions/repository/permissions.repository";
import { usersRepository } from "../../users/repository/users.repository";
import { CreateRoleDto } from "../dto/create-role.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";
import { RoleWithPermissions } from "../mapper/roles.mapper";
import { rolesRepository } from "../repository/roles.repository";

export class RolesService {
  // ── Roles CRUD ─────────────────────────────────────────────────────────────

  async listRoles(auth: TenantAuthContext): Promise<RoleWithPermissions[]> {
    return rolesRepository.list(auth.tenantId);
  }

  async getRole(
    auth: TenantAuthContext,
    roleId: string,
  ): Promise<RoleWithPermissions> {
    const role = await rolesRepository.findById(auth.tenantId, roleId);
    if (!role) {
      throw new NotFoundError("Role not found", undefined, "role.not_found");
    }
    return role;
  }

  async createRole(
    auth: TenantAuthContext,
    payload: CreateRoleDto,
  ): Promise<RoleWithPermissions> {
    const existing = await rolesRepository.findByCode(
      auth.tenantId,
      payload.code,
    );
    if (existing) {
      throw new ConflictError(
        "A role with this code already exists",
        undefined,
        "role.code_conflict",
      );
    }

    return rolesRepository.create({
      tenantId: auth.tenantId,
      code: payload.code,
      nameEn: payload.nameEn,
      nameAr: payload.nameAr,
    });
  }

  async updateRole(
    auth: TenantAuthContext,
    roleId: string,
    payload: UpdateRoleDto,
  ): Promise<RoleWithPermissions> {
    const role = await rolesRepository.findById(auth.tenantId, roleId);
    if (!role) {
      throw new NotFoundError("Role not found", undefined, "role.not_found");
    }

    if (payload.code !== undefined && payload.code !== role.code) {
      const conflict = await rolesRepository.findByCode(
        auth.tenantId,
        payload.code,
      );
      if (conflict) {
        throw new ConflictError(
          "A role with this code already exists",
          undefined,
          "role.code_conflict",
        );
      }
    }

    return rolesRepository.update(auth.tenantId, roleId, payload);
  }

  async deactivateRole(
    auth: TenantAuthContext,
    roleId: string,
  ): Promise<RoleWithPermissions> {
    const role = await rolesRepository.findById(auth.tenantId, roleId);
    if (!role) {
      throw new NotFoundError("Role not found", undefined, "role.not_found");
    }
    if (!role.isActive) {
      throw new ConflictError(
        "Role is already inactive",
        undefined,
        "role.already_inactive",
      );
    }
    return rolesRepository.deactivate(auth.tenantId, roleId);
  }

  // ── Permission assignment ──────────────────────────────────────────────────

  async assignPermissions(
    auth: TenantAuthContext,
    roleId: string,
    permissionIds: string[],
  ): Promise<RoleWithPermissions> {
    const role = await rolesRepository.findById(auth.tenantId, roleId);
    if (!role) {
      throw new NotFoundError("Role not found", undefined, "role.not_found");
    }

    const found = await permissionsRepository.findByIds(permissionIds);
    if (found.length !== permissionIds.length) {
      throw new BadRequestError(
        "One or more permission IDs are invalid",
        undefined,
      );
    }

    await rolesRepository.assignPermissions(roleId, permissionIds);
    return rolesRepository.findById(auth.tenantId, roleId) as Promise<RoleWithPermissions>;
  }

  async removePermissions(
    auth: TenantAuthContext,
    roleId: string,
    permissionIds: string[],
  ): Promise<RoleWithPermissions> {
    const role = await rolesRepository.findById(auth.tenantId, roleId);
    if (!role) {
      throw new NotFoundError("Role not found", undefined, "role.not_found");
    }

    await rolesRepository.removePermissions(roleId, permissionIds);
    return rolesRepository.findById(auth.tenantId, roleId) as Promise<RoleWithPermissions>;
  }

  // ── User-role assignment ───────────────────────────────────────────────────

  async getUserRoles(
    auth: TenantAuthContext,
    userId: string,
  ): Promise<RoleWithPermissions[]> {
    const user = await usersRepository.findById(auth.tenantId, userId);
    if (!user) {
      throw new NotFoundError("User not found", undefined, "user.not_found");
    }
    return rolesRepository.getUserRoles(auth.tenantId, userId);
  }

  async assignRolesToUser(
    auth: TenantAuthContext,
    userId: string,
    roleIds: string[],
  ): Promise<RoleWithPermissions[]> {
    const user = await usersRepository.findById(auth.tenantId, userId);
    if (!user) {
      throw new NotFoundError("User not found", undefined, "user.not_found");
    }

    // Validate all roleIds belong to this tenant
    const roles = await Promise.all(
      roleIds.map((id) => rolesRepository.findById(auth.tenantId, id)),
    );
    const invalid = roles.some((r) => r === null);
    if (invalid) {
      throw new BadRequestError(
        "One or more role IDs are invalid or do not belong to this tenant",
      );
    }

    await rolesRepository.assignRolesToUser(userId, roleIds);
    return rolesRepository.getUserRoles(auth.tenantId, userId);
  }

  async removeRolesFromUser(
    auth: TenantAuthContext,
    userId: string,
    roleIds: string[],
  ): Promise<RoleWithPermissions[]> {
    const user = await usersRepository.findById(auth.tenantId, userId);
    if (!user) {
      throw new NotFoundError("User not found", undefined, "user.not_found");
    }

    await rolesRepository.removeRolesFromUser(userId, roleIds);
    return rolesRepository.getUserRoles(auth.tenantId, userId);
  }
}

export const rolesService = new RolesService();
