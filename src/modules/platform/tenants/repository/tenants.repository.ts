import { Prisma, PreferredLanguage } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { TENANT_ROLES } from "../../../tenant/roles/constants/roles.constants";
import { CreateTenantDto } from "../dto/create-tenant.dto";
import { UpdateTenantDto } from "../dto/update-tenant.dto";
import { QueryTenantsDto } from "../dto/query-tenant.dto";
import { tenantInclude, TenantWithRelations } from "../mapper/tenants.mapper";

export class TenantsRepository {
  async findById(tenantId: string): Promise<TenantWithRelations | null> {
    return prisma.tenant.findUnique({
      where: { id: tenantId },
      include: tenantInclude,
    });
  }

  async list(query: QueryTenantsDto): Promise<TenantWithRelations[]> {
    return prisma.tenant.findMany({
      where: {
        ...(query.search
          ? {
              OR: [
                { nameEn: { contains: query.search, mode: "insensitive" } },
                { nameAr: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: tenantInclude,
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async createWithTransaction(
    payload: CreateTenantDto,
    plan: { id: string; trialDays: number },
    /**
     * When provided (signup flow), the owner TenantUser + tenant_owner Role
     * are created atomically in the same transaction.
     * Omit when creating a tenant directly via platform admin API — the owner
     * user can be added separately through the users module.
     */
    owner?: {
      email: string;
      passwordHash: string;
      fullName: string;
      preferredLanguage: PreferredLanguage;
    },
  ): Promise<TenantWithRelations> {
    const now = new Date();
    const trialEndsAt = new Date(
      now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000,
    );

    return prisma.$transaction(async (tx) => {
      // 1. Create Tenant + TenantSettings + Subscription
      const tenant = await tx.tenant.create({
        data: {
          nameEn: payload.nameEn,
          nameAr: payload.nameAr,
          preferredLanguage: payload.preferredLanguage,
          isTrialActive: true,
          trialEndsAt,
          settings: {
            create: {
              defaultLanguage: payload.preferredLanguage,
            },
          },
          subscriptions: {
            create: {
              planId: plan.id,
              status: "trialing",
              startsAt: now,
              trialEndsAt,
            },
          },
        },
        include: tenantInclude,
      });

      // 2–4. Owner user setup — only when coming from the signup flow
      if (owner) {
        const ownerRole = await tx.role.create({
          data: {
            tenantId: tenant.id,
            code: TENANT_ROLES.OWNER,
            nameEn: "Owner",
            nameAr: "المالك",
          },
        });

        const ownerUser = await tx.tenantUser.create({
          data: {
            tenantId: tenant.id,
            email: owner.email,
            passwordHash: owner.passwordHash,
            fullName: owner.fullName,
            preferredLanguage: owner.preferredLanguage,
          },
        });

        await tx.userRole.create({
          data: { userId: ownerUser.id, roleId: ownerRole.id },
        });
      }

      return tenant;
    });
  }

  async update(
    tenantId: string,
    payload: UpdateTenantDto,
  ): Promise<TenantWithRelations> {
    const data: Prisma.TenantUncheckedUpdateInput = {};

    if (payload.nameEn !== undefined) data.nameEn = payload.nameEn;
    if (payload.nameAr !== undefined) data.nameAr = payload.nameAr;
    if (payload.preferredLanguage !== undefined)
      data.preferredLanguage = payload.preferredLanguage;
    if (payload.status !== undefined) data.status = payload.status;

    return prisma.tenant.update({
      where: { id: tenantId },
      data,
      include: tenantInclude,
    });
  }
}

export const tenantsRepository = new TenantsRepository();
