import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { parseTenantLoginDto, parseDeviceRefreshDto } from "../validators/tenant-auth.validator";
import {
  tenantAuthService,
  TenantAuthService,
} from "../service/tenant-auth.service";
import { deviceSessionService } from "../../sync/service/device-session.service";

export class TenantAuthController {
  constructor(private readonly service: TenantAuthService) {}

  login = async (req: Request, res: Response) => {
    const payload = parseTenantLoginDto(req.body);
    const result = await this.service.login(payload);
    return res.status(200).json(
      successResponse(
        req.t?.("auth.login_success") || "Login successful",
        result,
        undefined,
        req.requestId,
      ),
    );
  };

  /**
   * POST /tenant/auth/device-refresh  (no auth — called when JWT has expired offline)
   * Accepts a long-lived device token and returns a fresh short-lived JWT.
   */
  deviceRefresh = async (req: Request, res: Response) => {
    const { deviceToken } = parseDeviceRefreshDto(req.body);
    const result = await deviceSessionService.refreshFromDeviceToken(deviceToken);
    return res.status(200).json(
      successResponse(
        req.t?.("auth.token_refreshed") || "Token refreshed",
        result,
        undefined,
        req.requestId,
      ),
    );
  };

  /**
   * POST /tenant/auth/heartbeat
   * Requires valid tenant JWT. Returns a fresh token with updated subscription claim.
   */
  heartbeat = async (req: Request, res: Response) => {
    if (!isTenantAuthContext(req.auth)) {
      return res.status(403).end();
    }

    const result = await this.service.heartbeat(req.auth);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        result,
        undefined,
        req.requestId,
      ),
    );
  };

  me = async (req: Request, res: Response) => {
    // req.auth is guaranteed to be a TenantAuthContext by tenantMiddleware
    const auth = req.auth!;

    if (!isTenantAuthContext(auth)) {
      // Should never reach here after tenantMiddleware
      return res.status(403).end();
    }

    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        {
          userId: auth.userId,
          tenantId: auth.tenantId,
          preferredLanguage: auth.preferredLanguage ?? null,
          roleCodes: auth.roleCodes,
          permissions: auth.permissions,
        },
        undefined,
        req.requestId,
      ),
    );
  };
}

export const tenantAuthController = new TenantAuthController(tenantAuthService);