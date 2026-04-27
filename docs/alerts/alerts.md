# Alerts Module

## Purpose

Provides query-time operational alerts for branch operators. Two alert types are supported:

1. **Low-stock** — inventory items where `quantityOnHand ≤ reorderLevel`
2. **Expiry** — inventory batches expiring within a configurable look-ahead window

Both alerts respect per-tenant feature flags (`lowStockAlerts`, `expiryAlerts`) in `TenantSettings`. If a flag is disabled the endpoint returns an empty array — no error is raised.

---

## Dependencies

- **`InventoryItem`** → `CatalogItem` — low-stock detection + product names
- **`InventoryBatch`** → `InventoryItem` → `CatalogItem` — expiry detection + product names
- **`TenantSettings`** — `lowStockAlerts` and `expiryAlerts` feature flags
- **`Notification`** — written by `POST /alerts/notify`; read via `GET /tenant/notifications`
- **Auth middleware** + **Tenant middleware** — all routes require a tenant-scoped JWT

---

## Endpoints

### `GET /tenant/alerts?branchId=<cuid>&days=N`

Combined endpoint — returns both low-stock and expiry alert lists in a single call.

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `CUID` | **Yes** | Branch to check |
| `days` | `integer 1–365` | No | Expiry look-ahead window (default `30`) |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "lowStock": [ /* same shape as GET /alerts/low-stock */ ],
    "expiring": [ /* same shape as GET /alerts/expiring */ ]
  },
  "meta": { "lowStockCount": 1, "expiringCount": 2 }
}
```

---

### `POST /tenant/alerts/notify?branchId=<cuid>&days=N`

Scans current alerts and creates `Notification` inbox records for the authenticated user. Safe to call on every page load — idempotent within the 48-hour dedup window.

**Query Parameters** — same as combined GET above.

**Dedup logic:**
- Before creating a notification, the service checks whether a notification of the same type (LOW_STOCK / EXPIRY_ALERT) with the same `metadata.refId` already exists for this user within the last 48 hours.
- `refId` for low-stock = `inventoryItemId`; for expiry = `batchId`.
- Already-notified items are silently skipped.

**Notification metadata shape:**
- LOW_STOCK: `{ refId, inventoryItemId, branchId, catalogItemId, catalogNameEn, catalogNameAr, quantityOnHand, reorderLevel }`
- EXPIRY_ALERT: `{ refId, batchId, inventoryItemId, branchId, catalogItemId, catalogNameEn, catalogNameAr, batchNumber, expiryDate, daysUntilExpiry, quantityOnHand }`

**Response `200`**

```json
{
  "success": true,
  "data": { "created": 3, "skipped": 1 }
}
```

**Side effects:** Creates `Notification` records — visible via `GET /tenant/notifications`.

---

### `GET /tenant/alerts/low-stock`

Returns all active inventory items at the branch where `quantityOnHand ≤ reorderLevel`. Items without a `reorderLevel` set are excluded.

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `CUID` | **Yes** | Branch to check |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "meta": { "count": 2 },
  "data": [
    {
      "inventoryItemId": "cuid",
      "branchId": "cuid",
      "catalogItemId": "cuid",
      "catalogNameEn": "Amoxicillin 500mg",
      "catalogNameAr": "أموكسيسيلين 500 مجم",
      "quantityOnHand": "5.000",
      "reorderLevel": "20.000"
    }
  ]
}
```

**Behaviour**
- Returns `[]` (empty array) if `TenantSettings.lowStockAlerts = false`.
- Low-stock comparison (`quantityOnHand ≤ reorderLevel`) is done in-memory after fetching items with a non-null `reorderLevel`.

---

### `GET /tenant/alerts/expiring`

Returns all active batches (with stock remaining) whose `expiryDate` falls within the next `days` days, sorted by earliest expiry first.

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `CUID` | **Yes** | Branch to check |
| `days` | `integer 1–365` | No | Look-ahead window (default: `30`) |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "meta": { "count": 1 },
  "data": [
    {
      "batchId": "cuid",
      "inventoryItemId": "cuid",
      "branchId": "cuid",
      "catalogItemId": "cuid",
      "catalogNameEn": "Paracetamol 500mg",
      "catalogNameAr": "باراسيتامول 500 مجم",
      "batchNumber": "BATCH-2024-001",
      "expiryDate": "2026-05-01T00:00:00.000Z",
      "quantityOnHand": "48.000",
      "daysUntilExpiry": 10
    }
  ]
}
```

**Behaviour**
- Returns `[]` (empty array) if `TenantSettings.expiryAlerts = false`.
- `daysUntilExpiry` is computed at query time as `ceil((expiryDate - now) / 86400000)`. Expired batches (negative value) are included if they still have stock.
- Only batches with `isActive = true` and `quantityOnHand > 0` are returned.

---

## Permissions

All endpoints require a valid tenant JWT. `tenantId` is always taken from the JWT.

---

## Tenant / Branch Scope

- All data is scoped by `tenantId` from JWT.
- `branchId` is required on every request to scope results to a single branch.

---

## Side Effects

- `GET /alerts`, `GET /alerts/low-stock`, `GET /alerts/expiring` — read-only, no side effects.
- `POST /alerts/notify` — creates `Notification` records in the DB for the authenticated user.

---

## Related Modules

- **Inventory** — source of `quantityOnHand` and `reorderLevel`
- **Inventory Batches** — source of `expiryDate` and batch-level stock
- **Settings** — `lowStockAlerts` and `expiryAlerts` feature flags
- **Notifications** — `POST /alerts/notify` writes here; `GET /notifications` reads it
- **Reports** (future) — alert counts may feed dashboard KPIs
