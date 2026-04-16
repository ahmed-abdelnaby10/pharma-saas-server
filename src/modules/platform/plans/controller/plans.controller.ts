import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import {
  parseCreatePlanDto,
  parsePlanIdParam,
  parseQueryPlansDto,
  parseUpdatePlanDto,
} from "../validators/plans.validator";
import { plansService, PlansService } from "../service/plans.service";

export class PlansController {
  constructor(private readonly service: PlansService) {}

  create = async (req: Request, res: Response) => {
    const payload = parseCreatePlanDto(req.body);
    const plan = await this.service.createPlan(payload);

    return res.status(201).json(
      successResponse(
        req.t?.("plan.created") || "Plan created successfully",
        plan,
        undefined,
        req.requestId,
      ),
    );
  };

  list = async (req: Request, res: Response) => {
    const query = parseQueryPlansDto(req.query);
    const plans = await this.service.listPlans(query);

    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        plans,
        undefined,
        req.requestId,
      ),
    );
  };

  getById = async (req: Request, res: Response) => {
    const planId = parsePlanIdParam(req.params);
    const plan = await this.service.getPlan(planId);

    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        plan,
        undefined,
        req.requestId,
      ),
    );
  };

  update = async (req: Request, res: Response) => {
    const planId = parsePlanIdParam(req.params);
    const payload = parseUpdatePlanDto(req.body);
    const plan = await this.service.updatePlan(planId, payload);

    return res.status(200).json(
      successResponse(
        req.t?.("plan.updated") || "Plan updated successfully",
        plan,
        undefined,
        req.requestId,
      ),
    );
  };
}

export const plansController = new PlansController(plansService);
