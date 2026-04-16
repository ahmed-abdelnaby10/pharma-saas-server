import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../errors/forbidden-error";
import { UnauthorizedError } from "../errors/unauthorized-error";

const hasAllPermissions = (
  currentPermissions: string[],
  requiredPermissions: string[],
): boolean => {
  return requiredPermissions.every((permission) =>
    currentPermissions.includes(permission),
  );
};

export const permissionMiddleware = (requiredPermissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(
        new UnauthorizedError(
          "Authorization token is required",
          undefined,
          "auth.token_required",
        ),
      );
    }

    if (requiredPermissions.length === 0) {
      return next();
    }

    const currentPermissions = req.auth?.permissions || [];
    const hasAll = hasAllPermissions(currentPermissions, requiredPermissions);

    if (!hasAll) {
      return next(
        new ForbiddenError(
          "Missing required permissions",
          {
            requiredPermissions,
          },
          "common.forbidden",
        ),
      );
    }

    next();
  };
};
