import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../errors/forbidden-error";
import { UnauthorizedError } from "../errors/unauthorized-error";
import { isPlatformAuthContext } from "../types/auth.types";

export const platformMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (!req.auth) {
    return next(
      new UnauthorizedError(
        "Authorization token is required",
        undefined,
        "auth.token_required",
      ),
    );
  }

  if (!isPlatformAuthContext(req.auth)) {
    return next(
      new ForbiddenError(
        "Platform admin context is required",
        undefined,
        "admin.platform_scope_required",
      ),
    );
  }

  next();
};
