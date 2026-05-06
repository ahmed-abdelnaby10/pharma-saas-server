import { Prisma } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { CreatePlanDto } from "../dto/create-plan.dto";
import { QueryPlansDto } from "../dto/query-plan.dto";
import { UpdatePlanDto } from "../dto/update-plan.dto";
import { PlanWithFeatures } from "../mapper/plans.mapper";

const planInclude = {
  features: {
    include: { definition: true },
    orderBy: { featureKey: "asc" },
  },
} satisfies Prisma.PlanInclude;

const buildCreatePlanData = (
  payload: CreatePlanDto,
): Prisma.PlanCreateWithoutFeaturesInput => {
  return {
    code: payload.code,
    name: payload.name,
    description: payload.description ?? null,
    billingInterval: payload.billingInterval,
    price: new Prisma.Decimal(payload.price),
    currency: payload.currency,
    trialDays: payload.trialDays,
    isActive: payload.isActive,
  };
};

const buildUpdatePlanData = (
  payload: UpdatePlanDto,
): Prisma.PlanUncheckedUpdateInput => {
  const data: Prisma.PlanUncheckedUpdateInput = {};

  if (payload.code !== undefined) {
    data.code = payload.code;
  }

  if (payload.name !== undefined) {
    data.name = payload.name;
  }

  if ("description" in payload) {
    data.description = payload.description ?? null;
  }

  if (payload.billingInterval !== undefined) {
    data.billingInterval = payload.billingInterval;
  }

  if (payload.price !== undefined) {
    data.price = new Prisma.Decimal(payload.price);
  }

  if (payload.currency !== undefined) {
    data.currency = payload.currency;
  }

  if (payload.trialDays !== undefined) {
    data.trialDays = payload.trialDays;
  }

  if (payload.isActive !== undefined) {
    data.isActive = payload.isActive;
  }

  return data;
};

export class PlansRepository {
  async findById(planId: string): Promise<PlanWithFeatures | null> {
    return prisma.plan.findUnique({
      where: {
        id: planId,
      },
      include: planInclude,
    });
  }

  async findByCode(code: string): Promise<PlanWithFeatures | null> {
    return prisma.plan.findUnique({
      where: {
        code,
      },
      include: planInclude,
    });
  }

  async list(query: QueryPlansDto): Promise<PlanWithFeatures[]> {
    return prisma.plan.findMany({
      where: {
        ...(query.search
          ? {
              OR: [
                {
                  code: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
                {
                  name: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.billingInterval
          ? { billingInterval: query.billingInterval }
          : {}),
      },
      include: planInclude,
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
    });
  }

  async create(payload: CreatePlanDto): Promise<PlanWithFeatures> {
    return prisma.plan.create({
      data: {
        ...buildCreatePlanData(payload),
        features: {
          create: payload.features.map((feature) => ({
            featureKey: feature.featureKey,
            enabled: feature.enabled,
            limitValue: feature.limitValue,
          })),
        },
      },
      include: planInclude,
    });
  }

  async update(
    planId: string,
    payload: UpdatePlanDto,
  ): Promise<PlanWithFeatures> {
    return prisma.plan.update({
      where: {
        id: planId,
      },
      data: {
        ...buildUpdatePlanData(payload),
        ...(payload.features
          ? {
              features: {
                deleteMany: {},
                create: payload.features.map((feature) => ({
                  featureKey: feature.featureKey,
                  enabled: feature.enabled,
                  limitValue: feature.limitValue,
                })),
              },
            }
          : {}),
      },
      include: planInclude,
    });
  }
}

export const plansRepository = new PlansRepository();
