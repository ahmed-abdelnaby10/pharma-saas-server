import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isPlatformAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { createSignupRequestSchema } from "../dto/create-signup-request.dto";
import { querySignupRequestsSchema } from "../dto/query-signup-requests.dto";
import { rejectSignupRequestSchema } from "../dto/review-signup-request.dto";
import { parseSignupIdParam } from "../validators/signups.validator";
import { signupsService } from "../service/signups.service";

class SignupsController {
  /** POST /api/v1/signups — public, no auth */
  submit = async (req: Request, res: Response): Promise<void> => {
    const body = createSignupRequestSchema.parse(req.body);
    const result = await signupsService.submit(body);
    res.status(201).json(
      successResponse(
        req.t?.("signup.submitted") || "Signup request submitted",
        result,
        undefined,
        req.requestId,
      ),
    );
  };

  /** GET /api/v1/platform/signups — platform admin only */
  list = async (req: Request, res: Response): Promise<void> => {
    const query = querySignupRequestsSchema.parse(req.query);
    const results = await signupsService.list(query);
    res.json(
      successResponse(req.t?.("common.ok") || "OK", results, undefined, req.requestId),
    );
  };

  /** GET /api/v1/platform/signups/:id */
  getById = async (req: Request, res: Response): Promise<void> => {
    const id = parseSignupIdParam(req.params);
    const result = await signupsService.getById(id);
    res.json(
      successResponse(req.t?.("common.ok") || "OK", result, undefined, req.requestId),
    );
  };

  /** POST /api/v1/platform/signups/:id/approve */
  approve = async (req: Request, res: Response): Promise<void> => {
    if (!isPlatformAuthContext(req.auth)) {
      throw new ForbiddenError("Platform admin access required");
    }
    const id = parseSignupIdParam(req.params);
    const result = await signupsService.approve(id, req.auth.userId);
    res.json(
      successResponse(
        req.t?.("signup.approved") || "Signup request approved",
        result,
        undefined,
        req.requestId,
      ),
    );
  };

  /** POST /api/v1/platform/signups/:id/reject */
  reject = async (req: Request, res: Response): Promise<void> => {
    if (!isPlatformAuthContext(req.auth)) {
      throw new ForbiddenError("Platform admin access required");
    }
    const id = parseSignupIdParam(req.params);
    const body = rejectSignupRequestSchema.parse(req.body);
    const result = await signupsService.reject(id, req.auth.userId, body);
    res.json(
      successResponse(
        req.t?.("signup.rejected") || "Signup request rejected",
        result,
        undefined,
        req.requestId,
      ),
    );
  };
}

export const signupsController = new SignupsController();
