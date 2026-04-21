import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseShiftSummaryQuery,
  parseDailySalesQuery,
  parseStockValuationQuery,
} from "../validators/reports.validator";
import { reportsService, ReportsService } from "../service/reports.service";

export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  shiftSummary = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseShiftSummaryQuery(req.query);
    const report = await this.service.getShiftSummary(auth.tenantId, query, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", report, undefined, req.requestId),
    );
  };

  dailySales = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseDailySalesQuery(req.query);
    const report = await this.service.getDailySales(auth.tenantId, query, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", report, undefined, req.requestId),
    );
  };

  stockValuation = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseStockValuationQuery(req.query);
    const report = await this.service.getStockValuation(auth.tenantId, query, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", report, undefined, req.requestId),
    );
  };
}

export const reportsController = new ReportsController(reportsService);
