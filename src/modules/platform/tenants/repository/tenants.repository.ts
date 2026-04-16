import { Prisma } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
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
  ): Promise<TenantWithRelations> {
    const now = new Date();
    const trialEndsAt = new Date(
      now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000,
    );

    return prisma.$transaction(async (tx) => {
      return tx.tenant.create({
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
