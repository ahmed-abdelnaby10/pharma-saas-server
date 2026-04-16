import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { CreatePlanDto } from "../dto/create-plan.dto";
import { QueryPlansDto } from "../dto/query-plan.dto";
import { UpdatePlanDto } from "../dto/update-plan.dto";
import { mapPlanResponse } from "../mapper/plans.mapper";
import { plansRepository, PlansRepository } from "../repository/plans.repository";

export class PlansService {
  constructor(private readonly repository: PlansRepository) {}

  async createPlan(payload: CreatePlanDto) {
    const existingPlan = await this.repository.findByCode(payload.code);

    if (existingPlan) {
      throw new ConflictError(
        "Plan code already exists",
        {
          code: payload.code,
        },
        "plan.code_already_exists",
      );
    }

    const plan = await this.repository.create(payload);

    return mapPlanResponse(plan);
  }

  async listPlans(query: QueryPlansDto) {
    const plans = await this.repository.list(query);

    return plans.map(mapPlanResponse);
  }

  async getPlan(planId: string) {
    const plan = await this.repository.findById(planId);

    if (!plan) {
      throw new NotFoundError(
        "Plan not found",
        {
          planId,
        },
        "plan.not_found",
      );
    }

    return mapPlanResponse(plan);
  }

  async updatePlan(planId: string, payload: UpdatePlanDto) {
    const currentPlan = await this.repository.findById(planId);

    if (!currentPlan) {
      throw new NotFoundError(
        "Plan not found",
        {
          planId,
        },
        "plan.not_found",
      );
    }

    if (payload.code && payload.code !== currentPlan.code) {
      const existingPlan = await this.repository.findByCode(payload.code);

      if (existingPlan) {
        throw new ConflictError(
          "Plan code already exists",
          {
            code: payload.code,
          },
          "plan.code_already_exists",
        );
      }
    }

    const updatedPlan = await this.repository.update(planId, payload);

    return mapPlanResponse(updatedPlan);
  }
}

export const plansService = new PlansService(plansRepository);
