/**
 * Idempotency header — client supplies a stable UUID per logical operation.
 * Backend caches the 2xx response in Redis for 24 h so retries return the
 * same result without re-executing business logic.
 *
 * Convention: value must be a UUID v4 string.
 */
export const IDEMPOTENCY_KEY_HEADER = "x-idempotency-key";

/**
 * Optional device / client identifier included by desktop clients.
 * Not enforced or required by the backend in this version — reserved for
 * future per-device audit attribution.
 */
export const CLIENT_ID_HEADER = "x-client-id";
