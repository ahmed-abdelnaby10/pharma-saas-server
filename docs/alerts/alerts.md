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
- **Auth middleware** + **Tenant middleware** — all routes require a tenant-scoped JWT

---

## Endpoints

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

None — both endpoints are read-only.

---

## Related Modules

- **Inventory** — source of `quantityOnHand` and `reorderLevel`
- **Inventory Batches** — source of `expiryDate` and batch-level stock
- **Settings** — `lowStockAlerts` and `expiryAlerts` feature flags
- **Reports** (future) — alert counts may feed dashboard KPIs
