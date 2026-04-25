# Offline Sync / Idempotency Foundation

## Overview

The backend is designed to safely accept retried write operations from an offline-first desktop client that uses a local **SQLite** database for operational storage. When internet connectivity returns, the desktop syncs its queue of offline-created operations to the backend.

The design ensures:
- No duplicate business records on retry (two independent safety layers)
- Clear acknowledgment so the desktop can reconcile local SQLite IDs with server IDs
- Backward compatibility — existing web/API clients are unaffected

---

## Two-Layer Idempotency

### Layer 1 — HTTP-level (Redis cache, `X-Idempotency-Key` header)

The desktop sends a stable, client-generated UUID in the `X-Idempotency-Key` header on every sync write request.

```
POST /tenant/pos
X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
Content-Type: application/json
```

**Flow:**
1. Middleware reads the header.
2. **Cache hit** → returns the stored 2xx response immediately; business logic is NOT re-executed; `syncAck.fromCache: true`.
3. **Cache miss** → executes the handler, captures the 2xx response, stores it in Redis for **24 hours**, injects `syncAck.fromCache: false`.

Error responses (4xx, 5xx) are **never cached**. A transient error does not permanently block a key — the client should retry.

The header is **opt-in**. Requests without the header pass through normally.

### Layer 2 — Data-level (`externalId` field)

The request body may include an `externalId` — the client's local SQLite primary key for the record.

```json
{
  "externalId": "550e8400-e29b-41d4-a716-446655440000",
  "branchId": "...",
  "shiftId": "...",
  ...
}
```

The service checks `(tenantId, externalId)` in the database before running any business logic. If a record already exists, it is returned immediately — the Redis cache has expired or was flushed, but the record is safe.

This layer handles **long-tail retries** where the 24 h Redis TTL has passed.

**Models with `externalId` support:**

| Model | Route example |
|---|---|
| `Sale` | `POST /tenant/pos` | ✅ fully wired |
| `Shift` | `POST /tenant/shifts`, `POST /tenant/shifts/:id/close` | ✅ fully wired |
| `StockMovement` | `POST /tenant/stock-movements` | ✅ fully wired |
| `PurchaseOrder` | `POST /tenant/purchasing` | 🔲 DB column ready, wiring pending |

> **Scope note:** `Sale`, `Shift`, and `StockMovement` have both layers wired. `PurchaseOrder` has the `externalId` DB column and unique index ready — service/validator/middleware wiring is a follow-up.

---

## Sync Acknowledgment (`syncAck`)

Every response to a request that included `X-Idempotency-Key` contains a `meta.syncAck` object:

```json
{
  "success": true,
  "message": "Sale created",
  "data": {
    "id": "clx_server_abc123",
    "externalId": "550e8400-e29b-41d4-a716-446655440000",
    "saleNumber": "SALE-M7X3K",
    "total": "450.00",
    ...
  },
  "meta": {
    "syncAck": {
      "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
      "serverId": "clx_server_abc123",
      "externalId": "550e8400-e29b-41d4-a716-446655440000",
      "syncedAt": "2026-04-23T14:00:00.000Z",
      "fromCache": false
    }
  },
  "requestId": "req_xyz"
}
```

### `syncAck` fields

| Field | Type | Description |
|---|---|---|
| `idempotencyKey` | string | Echoed back from the request header |
| `serverId` | string \| null | Server-assigned `id` of the created record |
| `externalId` | string \| null | Client's local SQLite ID echoed from `data.externalId` |
| `syncedAt` | ISO-8601 | Timestamp of the original successful processing (stable across retries) |
| `fromCache` | boolean | `true` if this was a cached replay; business logic was NOT re-executed |

### Desktop reconciliation pattern

```sql
-- After receiving a syncAck, the desktop marks the local queue item as synced:
UPDATE sync_queue
SET status = 'SYNCED', server_id = :serverId, synced_at = :syncedAt
WHERE idempotency_key = :idempotencyKey;

-- And attaches the server ID to the local business record:
UPDATE sales
SET server_id = :serverId, synced = 1
WHERE external_id = :externalId;
```

---

## Sync Conflict Error

When a conflict is detected (future: payload mismatch detection), the backend returns:

```json
{
  "success": false,
  "message": "A record with this external ID already exists",
  "errorCode": "SYNC_CONFLICT",
  "details": {
    "conflictType": "ALREADY_EXISTS",
    "externalId": "550e8400-e29b-41d4-a716-446655440000",
    "serverId": "clx_server_abc123",
    "hint": "The record was already synced. Use the serverId to reconcile."
  },
  "requestId": "req_xyz"
}
```

**Conflict types** (defined in `SyncConflictError`):

| Type | Meaning |
|---|---|
| `ALREADY_EXISTS` | Record with this `externalId` already exists; use `serverId` in details |
| `PAYLOAD_MISMATCH` | Same idempotency key, different payload — reserved for future payload hashing |
| `VERSION_CONFLICT` | Optimistic lock — client version is behind server; reserved for future version vectors |

> **Current behaviour:** The `ALREADY_EXISTS` conflict is not raised in this version — the service returns the existing record silently (idempotent 200/201). `SyncConflictError` is defined and ready for use in future conflict-detection passes.

---

## Infrastructure Files

| File | Purpose |
|---|---|
| `src/shared/constants/headers.constants.ts` | `X-Idempotency-Key` and `X-Client-Id` header name constants |
| `src/core/cache/cache.keys.ts` | Namespaced Redis key builders (`idempotency:v1:<key>`) |
| `src/core/cache/cache.service.ts` | Thin `get`/`set`/`del` wrapper around ioredis |
| `src/core/security/idempotency.ts` | `getIdempotentResponse` / `storeIdempotentResponse` (24 h TTL) |
| `src/core/http/sync-response.ts` | `SyncAck` TypeScript interface |
| `src/shared/errors/sync-conflict-error.ts` | `SyncConflictError` (409 `SYNC_CONFLICT`) |
| `src/shared/middlewares/idempotency.middleware.ts` | Express middleware — opt-in per route |

---

## Applying to New Routes

To make any write endpoint sync-safe:

### 1. Add idempotency middleware to the route

```typescript
import { idempotencyMiddleware } from "../../../../shared/middlewares/idempotency.middleware";

router.post(
  "/",
  asyncHandler(idempotencyMiddleware),
  asyncHandler(controller.create),
);
```

### 2. Add `externalId` to the Zod validator

```typescript
const createSchema = z.object({
  // ... existing fields
  externalId: z.string().max(128).nullish(),
});
```

### 3. Add `externalId` to the DTO

```typescript
export interface CreateXxxDto {
  // ... existing fields
  externalId?: string | null;
}
```

### 4. Add data-level dedup in the service

```typescript
async createXxx(tenantId: string, payload: CreateXxxDto, t: Translator) {
  if (payload.externalId) {
    const existing = await xxxRepository.findByExternalId(tenantId, payload.externalId);
    if (existing) return existing;
  }
  // ... normal creation logic
}
```

### 5. Add `findByExternalId` to the repository

```typescript
async findByExternalId(tenantId: string, externalId: string) {
  return prisma.xxx.findUnique({
    where: { tenantId_externalId: { tenantId, externalId } },
  });
}
```

### 6. Pass `externalId` into the create call

```typescript
await prisma.xxx.create({
  data: {
    // ... other fields
    ...(data.externalId != null ? { externalId: data.externalId } : {}),
  },
});
```

### 7. Include `externalId` in the response mapper

```typescript
export function mapXxxResponse(record: XxxRecord) {
  return {
    id: record.id,
    externalId: record.externalId ?? null,
    // ... other fields
  };
}
```

---

## Redis TTL and Retry Window

| Layer | TTL / Durability |
|---|---|
| Redis idempotency cache | 24 hours from first successful response |
| DB `externalId` uniqueness | Permanent (index on the table) |

The client sync queue should use **exponential backoff** with jitter. The 24 h Redis window covers the typical "device offline overnight" scenario. The `externalId` DB layer covers anything beyond 24 h.

---

## Known Gaps

1. **Payload hash verification** — the middleware does not check if the body of a retry matches the original. A different payload for the same idempotency key returns the cached response silently. This is safe (idempotent) but not strict. A future pass can add HMAC fingerprinting.

2. **`PurchaseOrder` not yet wired** — DB column and unique index exist; service/validator/middleware wiring is pending. `Sale`, `Shift`, and `StockMovement` are all fully wired.

3. **`X-Client-Id` header** — defined but not yet validated or stored in audit logs.

4. **Version vectors / conflict resolution** — `VERSION_CONFLICT` and `PAYLOAD_MISMATCH` conflict types are defined but never raised. Full optimistic-lock support is a future slice.

5. **Sync queue API** — there is no `GET /tenant/sync/queue` endpoint yet. The desktop manages its own local sync queue.
