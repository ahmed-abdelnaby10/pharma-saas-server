/**
 * Centralised Redis key builders.
 * All keys are namespaced and versioned so a cache flush or schema change
 * can be scoped to a single prefix without touching unrelated keys.
 */
export const CacheKeys = {
  /**
   * Stores the serialised HTTP response for an idempotency key.
   * TTL: 86 400 s (24 h).
   */
  idempotency: (key: string) => `idempotency:v1:${key}`,
} as const;
