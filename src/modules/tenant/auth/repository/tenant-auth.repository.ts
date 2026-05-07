import { Prisma } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";

const tenantUserAuthSelect = {
  id: true,
  tenantId: true,
  email: true,
  passwordHash: true,
  fullName: true,
  isActive: true,
  preferredLanguage: true,
  tenant: {
    select: {
      id: true,
      status: true,
      preferredLanguage: true,
    },
  },
} satisfies Prisma.TenantUserSelect;

export type TenantUserAuthRecord = Prisma.TenantUserGetPayload<{
  select: typeof tenantUserAuthSelect;
}>;

export class TenantAuthRepository {
  /** Used internally and by the refresh flow where we already have the tenantId. */
  async findUserByTenantAndEmail(
    tenantId: string,
    email: string,
  ): Promise<TenantUserAuthRecord | null> {
    return prisma.tenantUser.findUnique({
      where: { tenantId_email: { tenantId, email } },
      select: tenantUserAuthSelect,
    });
  }

  /**
   * Login flow: resolves slug → tenantId, then finds the user.
   * The caller never needs to know the tenant CUID.
   */
  async findUserBySlugAndEmail(
    slug: string,
    email: string,
  ): Promise<TenantUserAuthRecord | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tenant) return null;

    return prisma.tenantUser.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      select: tenantUserAuthSelect,
    });
  }
}

export const tenantAuthRepository = new TenantAuthRepository();