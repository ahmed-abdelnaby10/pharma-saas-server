import { Prisma } from "@prisma/client";

export const userWithRolesInclude = {
  branch: {
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
    },
  },
  userRoles: {
    include: {
      role: {
        select: {
          id: true,
          code: true,
          nameEn: true,
          nameAr: true,
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.TenantUserInclude;

export type UserRecord = Prisma.TenantUserGetPayload<{
  include: typeof userWithRolesInclude;
}>;

export const mapUserResponse = (user: UserRecord) => ({
  id: user.id,
  tenantId: user.tenantId,
  email: user.email,
  fullName: user.fullName,
  phone: user.phone ?? null,
  isActive: user.isActive,
  preferredLanguage: user.preferredLanguage,
  branch: user.branch
    ? { id: user.branch.id, nameEn: user.branch.nameEn, nameAr: user.branch.nameAr }
    : null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  roles: user.userRoles
    .filter((ur) => ur.role.isActive)
    .map((ur) => ({
      id: ur.role.id,
      code: ur.role.code,
      nameEn: ur.role.nameEn,
      nameAr: ur.role.nameAr,
    })),
  // passwordHash intentionally omitted
});
