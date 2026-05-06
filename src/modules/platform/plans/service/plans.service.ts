import { FeatureDefinition } from "@prisma/client";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { featureDefinitionsRepository } from "../../feature-definitions";
import { CreatePlanDto, PlanFeatureInputDto } from "../dto/create-plan.dto";
import { QueryPlansDto } from "../dto/query-plan.dto";
import { UpdatePlanDto } from "../dto/update-plan.dto";
import { mapPlanResponse } from "../mapper/plans.mapper";
import { plansRepository, PlansRepository } from "../repository/plans.repository";

export class PlansService {
  constructor(private readonly repository: PlansRepository) {}

  // ── Public methods ────────────────────────────────────────────────────────

  async createPlan(payload: CreatePlanDto, lang: string) {
    const existingPlan = await this.repository.findByCode(payload.code);

    if (existingPlan) {
      throw new ConflictError(
        "Plan code already exists",
        { code: payload.code },
        "plan.code_already_exists",
      );
    }

    if (payload.features.length > 0) {
      await this.validateFeatures(payload.features);
    }

    const plan = await this.repository.create(payload);

    return mapPlanResponse(plan, lang);
  }

  async listPlans(query: QueryPlansDto, lang: string) {
    const plans = await this.repository.list(query);

    return plans.map((plan) => mapPlanResponse(plan, lang));
  }

  async getPlan(planId: string, lang: string) {
    const plan = await this.repository.findById(planId);

    if (!plan) {
      throw new NotFoundError(
        "Plan not found",
        { planId },
        "plan.not_found",
      );
    }

    return mapPlanResponse(plan, lang);
  }

  async updatePlan(planId: string, payload: UpdatePlanDto, lang: string) {
    const currentPlan = await this.repository.findById(planId);

    if (!currentPlan) {
      throw new NotFoundError(
        "Plan not found",
        { planId },
        "plan.not_found",
      );
    }

    if (payload.code && payload.code !== currentPlan.code) {
      const existingPlan = await this.repository.findByCode(payload.code);

      if (existingPlan) {
        throw new ConflictError(
          "Plan code already exists",
          { code: payload.code },
          "plan.code_already_exists",
        );
      }
    }

    if (payload.features && payload.features.length > 0) {
      await this.validateFeatures(payload.features);
    }

    const updatedPlan = await this.repository.update(planId, payload);

    return mapPlanResponse(updatedPlan, lang);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Validates a feature input array against the live FeatureDefinition registry.
   *
   * Checks:
   *   1. Every key exists in the registry and is active.
   *   2. No duplicate keys within the same request.
   *   3. Boolean features must not carry limitValue.
   *   4. Limit features must carry limitValue (0 = unlimited is valid).
   *   5. When a key is enabled, all its requiresKeys must also be present and enabled.
   */
  private async validateFeatures(features: PlanFeatureInputDto[]): Promise<void> {
    const keys = features.map((f) => f.featureKey);

    // Bulk fetch definitions — one query, no N+1
    const definitions = await featureDefinitionsRepository.findManyByKeys(keys);
    const defMap = new Map<string, FeatureDefinition>(definitions.map((d) => [d.key, d]));

    const errors: string[] = [];
    const seenKeys = new Set<string>();

    for (const feature of features) {
      const key = feature.featureKey;

      // 1. Unknown / inactive key
      const def = defMap.get(key);
      if (!def) {
        errors.push(`Unknown feature key: "${key}"`);
        continue;
      }
      if (!def.isActive) {
        errors.push(`Feature "${key}" has been retired and can no longer be added to plans`);
        continue;
      }

      // 2. Duplicate key in same request
      if (seenKeys.has(key)) {
        errors.push(`Duplicate feature key: "${key}"`);
        continue;
      }
      seenKeys.add(key);

      // 3 & 4. Type ↔ limitValue consistency
      if (def.type === "boolean" && feature.limitValue != null) {
        errors.push(
          `Feature "${key}" is a boolean flag — limitValue must not be set`,
        );
      }
      if (def.type === "limit" && feature.limitValue == null) {
        errors.push(
          `Feature "${key}" is a numeric limit — limitValue is required (use 0 for unlimited)`,
        );
      }

      // 5. Dependency check — only when this feature is enabled
      if (feature.enabled && def.requiresKeys.length > 0) {
        for (const depKey of def.requiresKeys) {
          const depFeature = features.find(
            (f) => f.featureKey === depKey && f.enabled,
          );
          if (!depFeature) {
            errors.push(
              `Feature "${key}" requires "${depKey}" to also be enabled in this plan`,
            );
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestError(
        "Invalid feature configuration",
        { features: errors },
        "plan.invalid_features",
      );
    }
  }
}

export const plansService = new PlansService(plansRepository);
