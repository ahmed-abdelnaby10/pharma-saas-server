/**
 * SyncAck — included in `meta.syncAck` of every 2xx response that was
 * processed under an X-Idempotency-Key header.
 *
 * The desktop client uses this object to:
 *   1. Confirm the operation succeeded on the backend.
 *   2. Mark the queued item in the local SQLite sync queue as resolved.
 *   3. Attach `serverId` to the locally stored SQLite record so the two
 *      databases can be reconciled.
 *   4. Detect replays (`fromCache: true`) and skip side-effects that should
 *      only run once (e.g. printing a receipt).
 */
export interface SyncAck {
  /** The idempotency key the client sent. */
  idempotencyKey: string;

  /**
   * The server-assigned primary key of the created/updated record.
   * Extracted from `data.id` in the response body.
   * `null` for responses where `data` is not a single object.
   */
  serverId: string | null;

  /**
   * The client-generated externalId echoed back.
   * `null` if the request did not include an externalId.
   * Use this to reconcile the local SQLite record with the server record:
   *   UPDATE local_sales SET server_id = serverId, synced = 1
   *   WHERE external_id = externalId
   */
  externalId: string | null;

  /**
   * ISO-8601 timestamp of when the operation was originally processed.
   * On replays this is the time of the *first* successful response, not the
   * replay time — so it is stable across retries.
   */
  syncedAt: string;

  /**
   * `true`  — the response was served from the Redis idempotency cache;
   *            the business operation was NOT re-executed.
   * `false` — the operation executed now for the first time.
   */
  fromCache: boolean;
}
