# Sync Module

## Purpose

Provides all endpoints the offline-first pharmacy desktop POS client needs to:

1. **Bootstrap** — download a full snapshot of its branch on first install or after a cache wipe
2. **Delta sync** — fetch only the records that changed since the last sync
3. **Push** — upload a queue of offline-created operations (sales, shifts, stock movements)
4. **Device management** — register, list, and revoke POS terminals
5. **Device sessions** — issue and refresh long-lived offline tokens so the desktop can get a fresh JWT without a full login while offline
6. **Schema versioning** — let the desktop check compatibility before logging in

See `docs/sync/offline-sync.md` for the two-layer idempotency design and `syncAck` response envelope.

---

## Dependencies

| Dependency | Reason |
|---|---|
| `tenant-subscription` | Source of `license.validUntil` — used to set device session expiry |
| `pos` | Processes `sale` push operations |
| `shifts` | Processes `shift_open` / `shift_close` push operations |
| `stock-movements` | Processes `stock_movement` push operations |
| `inventory` | Bootstrap + delta inventory payloads |
| `patients` | Bootstrap + delta patient payloads |
| `prescriptions` | Bootstrap + delta prescription payloads |
| `tenant-auth` | `POST /tenant/auth/device-refresh` — hosted in tenant-auth routes |
| `roles` | `rolesRepository.resolveUserRolesAndPermissions` — used when minting JWT from device token |

---

## Headers

| Header | Required | Description |
|---|---|---|
| `Authorization: Bearer <jwt>` | Yes (all except `device-refresh`, `schema-version`) | Tenant JWT |
| `x-tenant-id` | Yes (authenticated routes) | Tenant CUID |
| `X-Device-Fingerprint` | Optional | Hardware fingerprint of the POS terminal — all authenticated sync routes auto-update `device.lastSyncAt` when present |
| `Idempotency-Key` | Recommended on `POST /push` | See idempotency docs |

---

## Endpoints

### `GET /tenant/sync/schema-version`

**Auth:** None  
**Purpose:** Desktop checks this before logging in to verify the server's DB schema is compatible.

**Response:**
```json
{
  "success": true,
  "data": {
    "serverSchemaVersion": 1,
    "minDesktopSchemaVersion": 1
  }
}
```

---

### `GET /tenant/sync/bootstrap?branchId=<cuid>`

**Auth:** Tenant JWT  
**Purpose:** One-shot full data seed. Called on first install or after a full SQLite cache wipe.

**Query params:**

| Param | Required | Description |
|---|---|---|
| `branchId` | Yes | CUID of the branch this POS terminal belongs to |

**Response shape:**
```json
{
  "schemaVersion": 1,
  "branch": { "id": "...", "nameEn": "...", "nameAr": "...", "address": "...", "phone": "...", "isDefault": true },
  "settings": {
    "organizationName": "...",
    "taxId": "...",
    "vatPercentage": "14",
    "receiptHeader": "...",
    "receiptFooter": "...",
    "defaultLanguage": "ar"
  },
  "catalogItems": [ { "id": "...", "nameEn": "...", "nameAr": "...", "genericName": "...", "unitOfMeasure": "...", "category": "..." } ],
  "inventoryItems": [ { "id": "...", "catalogItemId": "...", "branchId": "...", "quantityOnHand": "50", "reorderLevel": "10", "sellingPrice": "25.50", "isActive": true, "batches": [ { "id": "...", "batchNumber": "B001", "expiryDate": "2027-01-01T00:00:00.000Z", "quantityOnHand": "50", "costPrice": "20.00" } ] } ],
  "patients": [ { "id": "...", "fullName": "...", "phone": "...", "email": "...", "nationalId": "...", "gender": "MALE" } ],
  "activePrescriptions": [ { "id": "...", "status": "PENDING", "items": [] } ],
  "openShift": null,
  "license": {
    "issuedAt": "2026-04-26T00:00:00.000Z",
    "validUntil": "2026-04-27T00:00:00.000Z",
    "maxOfflineHours": 24,
    "subscriptionStatus": "active",
    "entitlements": {}
  }
}
```

**Side effects:** None  
**Errors:** `404 branch.not_found`

---

### `GET /tenant/sync/delta?branchId=<cuid>&since=<ISO>`

**Auth:** Tenant JWT  
**Purpose:** Fetch only records updated after `since`. Desktop stores the `asOf` from each response and uses it as `since` in the next call.

**Query params:**

| Param | Required | Description |
|---|---|---|
| `branchId` | Yes | CUID — scopes inventory and prescriptions |
| `since` | Yes | ISO 8601 with offset (e.g. `2026-04-25T00:00:00.000Z`) |

**Response shape:**
```json
{
  "since": "2026-04-25T00:00:00.000Z",
  "asOf": "2026-04-26T10:30:00.000Z",
  "inventoryItems": [],
  "patients": [],
  "prescriptions": [],
  "catalog": []
}
```

Records with `isActive: false` represent soft-deleted items — the desktop should mark them inactive in its local cache.

**Side effects:** None

---

### `POST /tenant/sync/push`

**Auth:** Tenant JWT  
**Purpose:** Push a batch of offline-created operations. Processed sequentially in received order — the desktop is responsible for ordering (e.g. `shift_open` before `sale`).

**Body:**
```json
{
  "operations": [
    {
      "externalId": "<desktop-uuid>",
      "type": "sale | shift_open | shift_close | stock_movement",
      "payload": { }
    }
  ]
}
```

| Field | Constraint | Description |
|---|---|---|
| `operations` | Array, 1–100 items | Ordered list of operations |
| `externalId` | String, 1–128 chars | Desktop's stable identifier for deduplication |
| `type` | Enum | `sale`, `shift_open`, `shift_close`, `stock_movement` |
| `payload` | Object | The full create-DTO for the operation type |

**Payload shapes per type:**

| Type | Payload fields |
|---|---|
| `sale` | Full `CreateSaleDto` including optional `saleNumber`, `clientCreatedAt`, `patientId` |
| `shift_open` | `branchId`, `openingBalance`, optional `clientCreatedAt` |
| `shift_close` | `shiftId`, `closingBalance`, optional `notes`, optional `clientClosedAt` |
| `stock_movement` | Full `CreateStockMovementDto` including optional `clientCreatedAt` |

**Response** (always 200 — one result per operation):
```json
{
  "success": true,
  "data": {
    "results": [
      { "externalId": "uuid-1", "status": "ok", "id": "clsaleid" },
      { "externalId": "uuid-2", "status": "error", "code": "conflict", "error": "..." }
    ]
  }
}
```

Error `code` values: `ok`, `conflict`, `not_found`, `invalid`, `error`.

**Side effects:**
- If `X-Device-Fingerprint` header is present, updates `device.lastSyncAt` (best-effort, does not block the response).

---

### `GET /tenant/sync/devices`

**Auth:** Tenant JWT  
**Purpose:** List all registered POS terminals for this tenant.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cldeviceid",
      "tenantId": "...",
      "branchId": "...",
      "fingerprint": "abc123",
      "label": "Cashier 1",
      "isActive": true,
      "lastSyncAt": "2026-04-26T10:00:00.000Z",
      "createdAt": "2026-04-01T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /tenant/sync/devices`

**Auth:** Tenant JWT  
**Purpose:** Register a new POS terminal or re-activate an existing one (upsert on `tenantId + fingerprint`).

**Body:**
```json
{
  "branchId": "<cuid>",
  "fingerprint": "<string 8–256 chars>",
  "label": "Cashier 1"
}
```

**Response:** 201 with the device record.

**Side effects:** Sets `isActive: true`, updates `lastSyncAt`.

---

### `DELETE /tenant/sync/devices/:deviceId`

**Auth:** Tenant JWT  
**Permissions:** Tenant admin  
**Purpose:** Deactivate a device and revoke all its active device sessions.

**Path param:** `deviceId` — CUID

**Side effects:**
- All `DeviceSession` rows for this device → `isRevoked: true`
- Device → `isActive: false`

---

### `POST /tenant/sync/devices/:deviceId/session`

**Auth:** Tenant JWT  
**Purpose:** Issue a long-lived device token tied to the authenticated user + device pair. The plaintext token is returned **once only** — the desktop must store it securely (OS keychain).

**Path param:** `deviceId` — CUID (must belong to this tenant, must be active)

**Side effects:**
- All prior active `DeviceSession` rows for this `deviceId + userId` → `isRevoked: true`
- New `DeviceSession` created with SHA-256 hashed token; `expiresAt = license.validUntil`

**Response (201):**
```json
{
  "success": true,
  "data": {
    "deviceToken": "a3f8c2d1e4b5...(64 hex chars, shown ONCE)",
    "expiresAt": "2026-04-27T00:00:00.000Z"
  }
}
```

**Errors:** `404 device.not_found` (device inactive or not belonging to this tenant)

---

### `POST /tenant/auth/device-refresh`

**Auth:** None (public endpoint — called when the JWT has expired)  
**Purpose:** Exchange a valid device token for a fresh short-lived JWT. Called by the desktop on wake from offline or when the current JWT has expired.

**Body:**
```json
{ "deviceToken": "<64-char hex>" }
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": { "accessToken": "eyJ..." }
}
```

**Validations (all return 401):**
- Token hash not found in DB → `auth.device_token_invalid`
- `isRevoked: true` → `auth.device_token_revoked`
- `expiresAt < now` → `auth.device_token_expired`
- `user.isActive = false` → `auth.user_inactive`
- `tenant.status ≠ active` → `auth.tenant_suspended`

**Side effects:** Updates `device.lastSyncAt` (best-effort).

---

## Offline Token Lifecycle

```
1. User logs in normally → gets short-lived JWT (e.g. 15 min)
2. POST /tenant/sync/devices  → register device (fingerprint)
3. POST /tenant/sync/devices/:deviceId/session  → get long-lived device token (store in OS keychain)
4. Use JWT for all API calls
5. JWT expires → call POST /tenant/auth/device-refresh with device token → get new JWT
6. If license.validUntil passes → device token also expires → user must log in again
7. Admin revokes device → DELETE /tenant/sync/devices/:deviceId → device token invalidated immediately
```

---

## Tenant/Branch Scope

| Endpoint | Tenant scope | Branch scope |
|---|---|---|
| `GET /bootstrap` | Always scoped by JWT `tenantId` | `branchId` query param |
| `GET /delta` | Always scoped by JWT `tenantId` | `branchId` query param |
| `POST /push` | Always scoped by JWT `tenantId` | Each operation payload includes `branchId` |
| `GET /devices` | Always scoped by JWT `tenantId` | None |
| `POST /devices` | Always scoped by JWT `tenantId` | `branchId` in body |
| `DELETE /devices/:deviceId` | Verified: device.tenantId must match JWT | None |
| `POST /devices/:deviceId/session` | Verified: device.tenantId must match JWT | None |
| `POST /auth/device-refresh` | No JWT — derived from stored session | None |

---

## Permissions

These endpoints require an authenticated tenant user (any role). No specific permission codes beyond the tenant JWT are currently enforced. Device revocation may be restricted to admin roles in a future slice.

---

## Related Modules

- `docs/sync/offline-sync.md` — idempotency, `syncAck`, conflict error shapes
- `docs/subscriptions/` — license envelope and `MAX_OFFLINE_HOURS` feature key
- `docs/shifts/` — shift open/close payload shapes
- `docs/pos/` — sale payload shape
- `docs/stock-movements/` — stock movement payload shape, `RECONCILIATION_IN` / `RECONCILIATION_OUT`
- `docs/inventory/` — `updatedSince` filter on list endpoints
- `docs/patients/` — `updatedSince` filter on list endpoints
