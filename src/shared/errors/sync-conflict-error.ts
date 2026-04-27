import { AppError } from "./app-error";

/**
 * Raised when a sync operation cannot be safely applied because a conflict
 * was detected on the backend.
 *
 * Conflict types:
 *
 * ALREADY_EXISTS     — A record with the supplied externalId already exists
 *                      for this tenant.  The existing server ID is included
 *                      in `details.serverId` so the client can reconcile.
 *
 * PAYLOAD_MISMATCH   — The same idempotency key was submitted twice but with
 *                      a different payload.  Reserved for future use — the
 *                      current foundation does not perform payload hashing.
 *
 * VERSION_CONFLICT   — The client's local version of a record is behind the
 *                      server version (optimistic-lock scenario).  Reserved
 *                      for future use when version vectors are introduced.
 */
export type SyncConflictType =
  | "ALREADY_EXISTS"
  | "PAYLOAD_MISMATCH"
  | "VERSION_CONFLICT";

export interface SyncConflictDetails {
  conflictType: SyncConflictType;
  externalId?: string;
  serverId?: string;
  hint?: string;
}

export class SyncConflictError extends AppError {
  constructor(
    message: string,
    public readonly conflictDetails: SyncConflictDetails,
  ) {
    super(message, 409, "SYNC_CONFLICT", conflictDetails);
  }
}
