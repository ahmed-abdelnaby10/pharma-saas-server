import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { parseTenantLoginDto } from "../validators/tenant-auth.validator";
import {
  tenantAuthService,
  TenantAuthService,
} from "../service/tenant-auth.service";

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