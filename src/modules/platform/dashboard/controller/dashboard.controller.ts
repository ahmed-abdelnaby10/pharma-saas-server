import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { dashboardService, DashboardService } from "../service/dashboard.service";

export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  get = async (req: Request, res: Response) => {
    const data = await this.service.getDashboard();
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        data,
        undefined,
        req.requestId,
      ),
    );
  };
}

export const dashboardController = new DashboardController(dashboardService);
