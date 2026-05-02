import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { parseQueryLowStock, parseQueryExpiring, parseQueryAllAlerts } from "../validators/alerts.validator";
import { alertsService, AlertsService } from "../service/alerts.service";

export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  lowStock = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryLowStock(req.query);
    const alerts = await this.service.getLowStockAlerts(auth.tenantId, query, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        alerts,
        { count: alerts.length },
        req.requestId,
      ),
    );
  };

  expiring = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryExpiring(req.query);
    const alerts = await this.service.getExpiringAlerts(auth.tenantId, query, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        alerts,
        { count: alerts.length },
        req.requestId,
      ),
    );
  };

  /** GET /tenant/alerts — combined low-stock + expiry in one call */
  all = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryAllAlerts(req.query);
    const result = await this.service.getAll(auth.tenantId, query, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        result,
        { lowStockCount: result.lowStock.length, expiringCount: result.expiring.length },
        req.requestId,
      ),
    );
  };

  /**
   * POST /tenant/alerts/notify
   * Scans current alerts and creates Notification records for items not already
   * notified within the last 48 hours. Safe to call repeatedly — idempotent
   * within the dedup window.
   */
  notify = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryAllAlerts(req.query);
    const result = await this.service.dispatchAlertNotifications(auth, query.branchId, query.days);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        result,
        undefined,
        req.requestId,
      ),
    );
  };
}

export const alertsController = new AlertsController(alertsService);
