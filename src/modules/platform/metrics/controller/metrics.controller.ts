import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { metricsService, MetricsService } from "../service/metrics.service";

export class MetricsController {
  constructor(private readonly service: MetricsService) {}

  getOverview = async (req: Request, res: Response) => {
    const data = await this.service.getOverview();
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        data,
        undefined,
        req.requestId,
      ),
    );
  };

  getTenantMetrics = async (req: Request, res: Response) => {
    const data = await this.service.getTenantMetrics();
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        data,
        undefined,
        req.requestId,
      ),
    );
  };

  getRevenueMetrics = async (req: Request, res: Response) => {
    const data = await this.service.getRevenueMetrics();
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

export const metricsController = new MetricsController(metricsService);
