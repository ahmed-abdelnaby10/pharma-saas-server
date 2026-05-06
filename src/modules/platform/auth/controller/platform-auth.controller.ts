import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import {
  parsePlatformLoginDto,
  parsePlatformRefreshDto,
} from "../validators/platform-auth.validator";
import {
  platformAuthService,
  PlatformAuthService,
} from "../service/platform-auth.service";

export class PlatformAuthController {
  constructor(private readonly service: PlatformAuthService) {}

  login = async (req: Request, res: Response) => {
    const payload = parsePlatformLoginDto(req.body);
    const result = await this.service.login(payload);

    return res.status(200).json(
      successResponse(
        req.t?.("admin.login_success") ?? "Admin login successful",
        result,
        undefined,
        req.requestId,
      ),
    );
  };

  /**
   * POST /api/v1/platform/auth/refresh
   *
   * Body: { "refreshToken": "<token>" }
   *
   * Returns a new access token + a new refresh token (rotation).
   * The client must replace its stored refresh token with the one returned
   * here — the old token is invalidated on the next call.
   */
  refresh = async (req: Request, res: Response) => {
    const { refreshToken } = parsePlatformRefreshDto(req.body);
    const result = await this.service.refresh(refreshToken);

    return res.status(200).json(
      successResponse(
        req.t?.("admin.token_refreshed") ?? "Token refreshed successfully",
        result,
        undefined,
        req.requestId,
      ),
    );
  };
}

export const platformAuthController = new PlatformAuthController(
  platformAuthService,
);
