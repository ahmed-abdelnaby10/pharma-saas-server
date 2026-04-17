import { Prisma } from "@prisma/client";

export const roleWithPermissionsInclude = {
  rolePermissions: {
    include: { permission: true },
  },
} satisfies Prisma.RoleInclude;

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: typeof roleWithPermissionsInclude;
}>;

export const mapRoleResponse = (role: RoleWithPermissions) => ({
  id: role.id,
  tenantId: role.tenantId,
  code: role.code,
  nameEn: role.nameEn,
  nameAr: role.nameAr,
  isActive: role.isActive,
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
  permissions: role.rolePermissions.map((rp) => ({
    id: rp.permission.id,
    code: rp.permission.code,
    nameEn: rp.permission.nameEn,
    nameAr: rp.permission.nameAr,
    module: rp.permission.module,
  })),
});

export const mapRoleListResponse = (role: RoleWithPermissions) =>
  mapRoleResponse(role);
