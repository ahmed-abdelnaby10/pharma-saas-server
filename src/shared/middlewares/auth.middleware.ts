import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../../core/security/jwt";
import { UnauthorizedError } from "../errors/unauthorized-error";

const extractBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice(7).trim();

  return token.length > 0 ? token : null;
};

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = extractBearerToken(req.header("authorization") || undefined);

  if (!token) {
    return next(
      new UnauthorizedError(
        "Authorization token is required",
        undefined,
        "auth.token_required",
      ),
    );
  }

  try {
    req.auth = verifyAccessToken(token);
    req.accessToken = token;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    }

    return next(
      new UnauthorizedError(
        "Invalid or expired token",
        undefined,
        "auth.token_invalid",
      ),
    );
  }
};
