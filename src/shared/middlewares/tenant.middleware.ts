import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../errors/forbidden-error";
import { UnauthorizedError } from "../errors/unauthorized-error";
import { isTenantAuthContext } from "../types/auth.types";

export const tenantMiddleware = (
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

  if (!isTenantAuthContext(req.auth)) {
    return next(
      new ForbiddenError(
        "Tenant context is required",
        undefined,
        "tenant.context_required",
      ),
    );
  }

  next();
};
