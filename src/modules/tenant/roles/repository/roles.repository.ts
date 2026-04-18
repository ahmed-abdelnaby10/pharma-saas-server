import { prisma } from "../../../../core/db/prisma";
import {
  roleWithPermissionsInclude,
  RoleWithPermissions,
} from "../mapper/roles.mapper";

export class RolesRepository {
  async findById(
    tenantId: string,
    roleId: string,
  ): Promise<RoleWithPermissions | null> {
    return prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: roleWithPermissionsInclude,
    });
  }

  async findByCode(
    tenantId: string,
    code: string,
  ): Promise<RoleWithPermissions | null> {
    return prisma.role.findUnique({
      where: { tenantId_code: { tenantId, code } },
      include: roleWithPermissionsInclude,
    });
  }

  async list(tenantId: string): Promise<RoleWithPermissions[]> {
    return prisma.role.findMany({
      where: { tenantId },
      include: roleWithPermissionsInclude,
      orderBy: { createdAt: "asc" },
    });
  }

  async create(payload: {
    tenantId: string;
    code: string;
    nameEn: string;
    nameAr: string;
  }): Promise<RoleWithPermissions> {
    return prisma.role.create({
      data: payload,
      include: roleWithPermissionsInclude,
    });
  }

  async update(
    tenantId: string,
    roleId: string,
    payload: { code?: string; nameEn?: string; nameAr?: string },
  ): Promise<RoleWithPermissions> {
    return prisma.role.update({
      where: { id: roleId },
      data: {
        ...(payload.code !== undefined ? { code: payload.code } : {}),
        ...(payload.nameEn !== undefined ? { nameEn: payload.nameEn } : {}),
        ...(payload.nameAr !== undefined ? { nameAr: payload.nameAr } : {}),
      },
      include: roleWithPermissionsInclude,
    });
  }

  async deactivate(tenantId: string, roleId: string): Promise<RoleWithPermissions> {
    return prisma.role.update({
      where: { id: roleId },
      data: { isActive: false },
      include: roleWithPermissionsInclude,
    });
  }

  // ── Permission assignment ──────────────────────────────────────────────────

  async assignPermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  }

  async removePermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await prisma.rolePermission.deleteMany({
      where: { roleId, permissionId: { in: permissionIds } },
    });
  }

  // ── User-role assignment ───────────────────────────────────────────────────

  async getUserRoles(
    tenantId: string,
    userId: string,
  ): Promise<RoleWithPermissions[]> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: roleWithPermissionsInclude,
        },
      },
    });
    // Filter to tenant scope (the FK already ensures this via tenantId on Role)
    return userRoles
      .filter((ur) => ur.role.tenantId === tenantId)
      .map((ur) => ur.role);
  }

  async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
    await prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    });
  }

  async removeRolesFromUser(userId: string, roleIds: string[]): Promise<void> {
    await prisma.userRole.deleteMany({
      where: { userId, roleId: { in: roleIds } },
    });
  }

  // ── JWT helpers ────────────────────────────────────────────────────────────

  /**
   * Resolves role codes and permission codes for a user.
   * Used during login to populate JWT payload.
   */
  async resolveUserRolesAndPermissions(userId: string): Promise<{
    roleCodes: string[];
    permissions: string[];
  }> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const roleCodes = userRoles
      .filter((ur) => ur.role.isActive)
      .map((ur) => ur.role.code);

    const permissionsSet = new Set<string>();
    for (const ur of userRoles) {
      if (!ur.role.isActive) continue;
      for (const rp of ur.role.rolePermissions) {
        permissionsSet.add(rp.permission.code);
      }
    }

    return { roleCodes, permissions: Array.from(permissionsSet) };
  }
}

export const rolesRepository = new RolesRepository();
