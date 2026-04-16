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
  async findUserByTenantAndEmail(
    tenantId: string,
    email: string,
  ): Promise<TenantUserAuthRecord | null> {
    return prisma.tenantUser.findUnique({
      where: {
        tenantId_email: { tenantId, email },
      },
      select: tenantUserAuthSelect,
    });
  }
}

export const tenantAuthRepository = new TenantAuthRepository();