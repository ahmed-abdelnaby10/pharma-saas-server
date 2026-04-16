import { z } from "zod";
import { CreatePlanDto } from "../dto/create-plan.dto";
import { QueryPlansDto } from "../dto/query-plan.dto";
import { UpdatePlanDto } from "../dto/update-plan.dto";

const featureSchema = z.object({
  featureKey: z.string().trim().min(2).max(120),
  enabled: z.boolean().default(true),
  limitValue: z.number().int().positive().optional(),
});

const normalizeCode = (value: string) => value.trim().toLowerCase();
const normalizeCurrency = (value: string) => value.trim().toUpperCase();
const normalizeFeatureKey = (value: string) => value.trim().toLowerCase();

const createPlanSchema = z.object({
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  billingInterval: z.enum(["monthly", "yearly"]),
  price: z.number().nonnegative(),
  currency: z.string().trim().length(3).default("EGP"),
  trialDays: z.number().int().min(0).max(365).default(14),
  isActive: z.boolean().default(true),
  features: z.array(featureSchema).default([]),
});

const updatePlanSchema = z
  .object({
    code: z.string().trim().min(2).max(50).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    billingInterval: z.enum(["monthly", "yearly"]).optional(),
    price: z.number().nonnegative().optional(),
    currency: z.string().trim().length(3).optional(),
    trialDays: z.number().int().min(0).max(365).optional(),
    isActive: z.boolean().optional(),
    features: z.array(featureSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const queryPlansSchema = z.object({
  search: z.string().trim().min(1).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  billingInterval: z.enum(["monthly", "yearly"]).optional(),
});

const planIdParamSchema = z.object({
  planId: z.string().trim().min(1),
});

export const parseCreatePlanDto = (input: unknown): CreatePlanDto => {
  const result = createPlanSchema.parse(input);

  return {
    ...result,
    code: normalizeCode(result.code),
    currency: normalizeCurrency(result.currency),
    description: result.description || undefined,
    features: result.features.map((feature) => ({
      ...feature,
      featureKey: normalizeFeatureKey(feature.featureKey),
    })),
  };
};

export const parseUpdatePlanDto = (input: unknown): UpdatePlanDto => {
  const result = updatePlanSchema.parse(input);

  return {
    ...result,
    code: result.code ? normalizeCode(result.code) : undefined,
    currency: result.currency
      ? normalizeCurrency(result.currency)
      : undefined,
    description: result.description || undefined,
    features: result.features?.map((feature) => ({
      ...feature,
      featureKey: normalizeFeatureKey(feature.featureKey),
    })),
  };
};

export const parseQueryPlansDto = (input: unknown): QueryPlansDto => {
  return queryPlansSchema.parse(input);
};

export const parsePlanIdParam = (input: unknown): string => {
  return planIdParamSchema.parse(input).planId;
};
