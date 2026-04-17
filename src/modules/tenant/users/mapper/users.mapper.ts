import { TenantUser } from "@prisma/client";

export type UserRecord = TenantUser;

export const mapUserResponse = (user: UserRecord) => ({
  id: user.id,
  tenantId: user.tenantId,
  branchId: user.branchId,
  email: user.email,
  fullName: user.fullName,
  isActive: user.isActive,
  preferredLanguage: user.preferredLanguage,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  // passwordHash intentionally omitted
});
