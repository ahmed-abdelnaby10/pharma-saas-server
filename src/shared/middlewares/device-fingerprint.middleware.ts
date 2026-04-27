import { Request, Response, NextFunction } from "express";
import { isTenantAuthContext } from "../types/auth.types";
import { prisma } from "../../core/db/prisma";

/**
 * Best-effort middleware that updates Device.lastSyncAt whenever a POS
 * terminal identifies itself via the `X-Device-Fingerprint` header.
 *
 * Apply after authMiddleware + tenantMiddleware on authenticated sync routes.
 * Never blocks the request — all errors are swallowed.
 */
export function deviceFingerprintMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const fingerprint = req.headers["x-device-fingerprint"];
  const auth = req.auth;

  if (
    fingerprint &&
    typeof fingerprint === "string" &&
    auth &&
    isTenantAuthContext(auth)
  ) {
    // Fire and forget — do NOT await, never block the request
    prisma.device
      .updateMany({
        where: { tenantId: auth.tenantId, fingerprint },
        data: { lastSyncAt: new Date() },
      })
      .catch(() => {
        /* best-effort */
      });
  }

  next();
}
