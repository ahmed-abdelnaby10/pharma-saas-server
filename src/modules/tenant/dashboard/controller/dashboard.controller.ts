import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { parseQueryDashboard } from "../validators/dashboard.validator";
import { dashboardService, DashboardService } from "../service/dashboard.service";

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  get = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryDashboard(req.query);
    const data = await this.service.getDashboard(auth.tenantId, query, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", data, undefined, req.requestId),
    );
  };
}

export const dashboardController = new DashboardController(dashboardService);
