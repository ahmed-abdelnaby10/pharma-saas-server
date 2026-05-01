import { NextFunction, Request, Response } from "express";
import { isTenantAuthContext } from "../types/auth.types";
import { ForbiddenError } from "../errors/forbidden-error";

const BLOCKED_STATUSES = new Set(["canceled", "expired", "none"]);

/**
 * Subscription guard — must run after authMiddleware + tenantMiddleware.
 *
 * Blocks access when the JWT subscription claim shows a terminal status
 * (canceled | expired | none). Trialing and past_due are allowed through
 * so users can still log in and view their dashboard.
 *
 * Routes that should be accessible even when locked (e.g. /auth, /subscription,
 * /notifications, /downloads) must be mounted BEFORE this middleware or on a
 * separate router that does not apply it.
 */
export const subscriptionGuard = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const auth = req.auth;

  if (!auth || !isTenantAuthContext(auth)) {
    return next();
  }

  const { subscription } = auth;

  if (!subscription) {
    // No claim embedded (old token format) — allow through; guard is best-effort
    return next();
  }

  if (BLOCKED_STATUSES.has(subscription.status)) {
    return next(
      new ForbiddenError(
        "Subscription is inactive. Please renew to continue.",
        { status: subscription.status },
        "subscription.inactive",
      ),
    );
  }

  next();
};
