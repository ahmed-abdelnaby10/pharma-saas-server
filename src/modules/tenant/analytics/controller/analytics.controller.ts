import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseTopItemsQuery,
  parseRevenueTrendQuery,
  parsePaymentMethodsQuery,
} from "../validators/analytics.validator";
import { analyticsService, AnalyticsService } from "../service/analytics.service";

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  topItems = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseTopItemsQuery(req.query);
    const result = await this.service.getTopItems(auth.tenantId, query, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        result,
        { count: result.rows.length },
        req.requestId,
      ),
    );
  };

  revenueTrend = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseRevenueTrendQuery(req.query);
    const result = await this.service.getRevenueTrend(auth.tenantId, query, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        result,
        { count: result.rows.length },
        req.requestId,
      ),
    );
  };

  paymentMethods = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parsePaymentMethodsQuery(req.query);
    const result = await this.service.getPaymentMethods(auth.tenantId, query, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", result, undefined, req.requestId),
    );
  };
}

export const analyticsController = new AnalyticsController(analyticsService);
