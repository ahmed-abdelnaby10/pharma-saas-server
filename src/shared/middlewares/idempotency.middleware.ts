import { Request, Response, NextFunction } from "express";
import { IDEMPOTENCY_KEY_HEADER } from "../constants/headers.constants";
import {
  getIdempotentResponse,
  storeIdempotentResponse,
} from "../../core/security/idempotency";
import { logger } from "../../core/logger/logger";
import { SyncAck } from "../../core/http/sync-response";

/**
 * Opt-in idempotency middleware for sync-safe write endpoints.
 *
 * Apply per-route to any POST/PATCH that offline desktop clients may retry:
 *   router.post("/", asyncHandler(idempotencyMiddleware), asyncHandler(controller.create));
 *
 * Flow
 * ─────
 * 1. Read `X-Idempotency-Key` from the request headers.
 * 2. If the header is absent → pass through (backward-compatible).
 * 3. If a cached response exists in Redis → replay it with `syncAck.fromCache: true`.
 * 4. Otherwise → intercept `res.json` to:
 *      a. Inject `meta.syncAck` (serverId, externalId, syncedAt, fromCache: false).
 *      b. Cache the response body in Redis for 24 h.
 *
 * Error responses are NOT cached — a transient error must not permanently
 * block an idempotency key.  The client should retry until it gets a 2xx.
 *
 * Redis failures are swallowed so that a cache outage never blocks writes.
 */
export async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rawKey = req.headers[IDEMPOTENCY_KEY_HEADER];
  const idempotencyKey =
    typeof rawKey === "string" ? rawKey.trim() : undefined;

  // Header absent — middleware is a no-op for this request.
  if (!idempotencyKey) {
    return next();
  }

  // ── Cache hit: replay the stored response ──────────────────────────────────
  let cached = null;
  try {
    cached = await getIdempotentResponse(idempotencyKey);
  } catch (err) {
    // Redis down — fall through and execute the handler normally.
    logger.warn("idempotency: cache lookup failed, proceeding without cache", {
      idempotencyKey,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (cached) {
    const body = cached.body as Record<string, unknown>;
    const meta = ((body.meta as Record<string, unknown>) ??
      {}) as Record<string, unknown>;
    const existingAck = meta.syncAck as Partial<SyncAck> | undefined;

    // Overwrite syncAck to mark this as a cache replay.
    const replayAck: SyncAck = {
      idempotencyKey,
      serverId: existingAck?.serverId ?? null,
      externalId: existingAck?.externalId ?? null,
      syncedAt: existingAck?.syncedAt ?? cached.storedAt,
      fromCache: true,
    };
    meta.syncAck = replayAck;
    body.meta = meta;

    res.status(cached.statusCode).json(body);
    return;
  }

  // ── Cache miss: intercept res.json to capture and cache the response ───────
  const originalJson = res.json.bind(res) as (body: unknown) => Response;

  res.json = function (body: unknown): Response {
    const statusCode = res.statusCode;

    if (
      statusCode >= 200 &&
      statusCode < 300 &&
      body !== null &&
      typeof body === "object"
    ) {
      const mutableBody = body as Record<string, unknown>;
      const meta = ((mutableBody.meta as Record<string, unknown>) ??
        {}) as Record<string, unknown>;
      const data = mutableBody.data as Record<string, unknown> | undefined;

      const syncAck: SyncAck = {
        idempotencyKey,
        serverId: typeof data?.id === "string" ? data.id : null,
        externalId:
          typeof data?.externalId === "string" ? data.externalId : null,
        syncedAt: new Date().toISOString(),
        fromCache: false,
      };

      meta.syncAck = syncAck;
      mutableBody.meta = meta;

      // Fire-and-forget cache write — never block the response.
      storeIdempotentResponse(idempotencyKey, statusCode, mutableBody).catch(
        (err: unknown) => {
          logger.error("idempotency: failed to cache response", {
            idempotencyKey,
            error: err instanceof Error ? err.message : String(err),
          });
        },
      );
    }

    return originalJson(body);
  };

  next();
}
