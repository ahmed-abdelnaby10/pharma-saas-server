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

const meSelect = {
  id: true,
  tenantId: true,
  email: true,
  fullName: true,
  isActive: true,
  preferredLanguage: true,
  branchId: true,
  createdAt: true,
  tenant: {
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      slug: true,
      status: true,
      isTrialActive: true,
      trialEndsAt: true,
      createdAt: true,
      subscriptions: {
        where: { status: { in: ["trialing", "active", "past_due"] } },
        orderBy: { createdAt: "desc" as const },
        take: 1,
        select: {
          id: true,
          status: true,
          startsAt: true,
          endsAt: true,
          trialEndsAt: true,
          plan: {
            select: {
              id: true,
              code: true,
              name: true,
              billingInterval: true,
              price: true,
              currency: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.TenantUserSelect;

export type TenantMeRecord = Prisma.TenantUserGetPayload<{
  select: typeof meSelect;
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

  /**
   * Refresh flow — find user by id + tenantId to verify account is still active.
   */
  async findUserById(
    userId: string,
    tenantId: string,
  ): Promise<TenantUserAuthRecord | null> {
    return prisma.tenantUser.findUnique({
      where: { id: userId, tenantId },
      select: tenantUserAuthSelect,
    });
  }

  /**
   * /me — full profile query: user + tenant + current subscription + plan.
   * Single round-trip via nested includes.
   */
  async findMeData(
    userId: string,
    tenantId: string,
  ): Promise<TenantMeRecord | null> {
    return prisma.tenantUser.findUnique({
      where: { id: userId, tenantId },
      select: meSelect,
    });
  }
}

export const tenantAuthRepository = new TenantAuthRepository();
