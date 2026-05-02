import { cacheService } from "../cache/cache.service";
import { CacheKeys } from "../cache/cache.keys";

/** How long an idempotency record is kept in Redis. */
const IDEMPOTENCY_TTL_SECONDS = 86_400; // 24 hours

/**
 * Shape stored in Redis for each processed idempotency key.
 * `storedAt` is an ISO-8601 string recorded at the time the first successful
 * response was cached — replays carry this timestamp so clients can see when
 * the operation originally completed.
 */
export interface IdempotencyCachedResponse {
  statusCode: number;
  body: unknown;
  storedAt: string;
}

/**
 * Look up a previously cached response for the given key.
 * Returns `null` if the key is not in Redis (first attempt, or TTL expired).
 */
export async function getIdempotentResponse(
  key: string,
): Promise<IdempotencyCachedResponse | null> {
  const raw = await cacheService.get(CacheKeys.idempotency(key));
  if (!raw) return null;
  return JSON.parse(raw) as IdempotencyCachedResponse;
}

/**
 * Persist a successful response so future replays can return it without
 * re-executing any business logic.
 *
 * Only call this for 2xx responses — error responses must NOT be cached
 * because a transient error should not permanently block an idempotency key.
 */
export async function storeIdempotentResponse(
  key: string,
  statusCode: number,
  body: unknown,
): Promise<void> {
  const payload: IdempotencyCachedResponse = {
    statusCode,
    body,
    storedAt: new Date().toISOString(),
  };
  await cacheService.set(
    CacheKeys.idempotency(key),
    JSON.stringify(payload),
    IDEMPOTENCY_TTL_SECONDS,
  );
}
