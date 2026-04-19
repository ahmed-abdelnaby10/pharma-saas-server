import { TenantSettings } from "@prisma/client";
import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { parseUpdateSettingsDto } from "../validators/settings.validator";
import { settingsService, SettingsService } from "../service/settings.service";

const mapSettingsResponse = (s: TenantSettings) => ({
  id: s.id,
  tenantId: s.tenantId,
  organizationName: s.organizationName,
  taxId: s.taxId,
  phone: s.phone,
  email: s.email,
  lowStockAlerts: s.lowStockAlerts,
  expiryAlerts: s.expiryAlerts,
  purchaseOrderUpdates: s.purchaseOrderUpdates,
  receiptHeader: s.receiptHeader,
  receiptFooter: s.receiptFooter,
  vatPercentage: s.vatPercentage.toString(),
  defaultLanguage: s.defaultLanguage,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  get = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const settings = await this.service.getSettings(auth);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        mapSettingsResponse(settings),
        undefined,
        req.requestId,
      ),
    );
  };

  update = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();

    const payload = parseUpdateSettingsDto(req.body);
    const settings = await this.service.updateSettings(auth, payload);
    return res.status(200).json(
      successResponse(
        req.t?.("settings.updated") || "Settings updated",
        mapSettingsResponse(settings),
        undefined,
        req.requestId,
      ),
    );
  };
}

export const settingsController = new SettingsController(settingsService);
