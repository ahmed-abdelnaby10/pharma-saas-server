import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { parsePlatformLoginDto } from "../validators/platform-auth.validator";
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
        req.t?.("admin.login_success") || "Admin login successful",
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
