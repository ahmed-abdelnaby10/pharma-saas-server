# Dashboard Module

## Purpose

A single endpoint that returns a complete branch-level KPI summary in one round trip. Designed as the data source for the branch operator's home screen. All queries run concurrently via `Promise.all` to minimise latency.

---

## Dependencies

- **`Sale`** — today's and month-to-date revenue aggregation
- **`Shift`** — active shift snapshot
- **`InventoryItem`** — low-stock count (same logic as Alerts module)
- **`InventoryBatch`** — expiring-soon count (30-day window)
- **`TenantSettings`** — `lowStockAlerts` and `expiryAlerts` feature flags
- **Auth middleware** + **Tenant middleware** — all routes require a tenant-scoped JWT

---

## Endpoints

### `GET /tenant/dashboard`

Returns aggregated KPI data for a branch.

**Query Parameters**

| Param | Type | Required |
|-------|------|----------|
| `branchId` | `CUID` | **Yes** |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "branchId": "cuid",
    "generatedAt": "2026-04-21T09:30:00.000Z",

    "todaySaleCount": 18,
    "todayRevenue": "2070.00",
    "todayVatAmount": "270.00",

    "monthSaleCount": 312,
    "monthRevenue": "38640.00",

    "activeShift": {
      "shiftId": "cuid",
      "cashierName": "Ahmed Ali",
      "openedAt": "2026-04-21T08:00:00.000Z",
      "openingBalance": "500.00"
    },

    "lowStockCount": 4,
    "expiringSoonCount": 7
  }
}
```

**Notes**
- `activeShift` is `null` if no shift is currently open at the branch.
- `lowStockCount` is `0` (not an error) if `TenantSettings.lowStockAlerts = false`.
- `expiringSoonCount` is `0` (not an error) if `TenantSettings.expiryAlerts = false`.
- Revenue figures include only `COMPLETED` sales. Cancelled sales are excluded.
- `generatedAt` reflects the server time at the moment the request was processed — useful for cache-busting on the client.

---

## Permissions

Requires a valid tenant JWT. `tenantId` is always taken from the JWT.

---

## Tenant / Branch Scope

All data is scoped by `tenantId` from JWT and `branchId` from the query parameter.

---

## Performance

All sub-queries run in parallel via `Promise.all`:
- Two `sale.aggregate` calls (today, month-to-date)
- One `shift.findFirst` (active shift)
- One `inventoryItem.findMany` (low-stock candidates)
- One `inventoryBatch.count` (expiring soon)

---

## Side Effects

None — read-only.

---

## Related Modules

- **Alerts** — detailed alert lists (low-stock items, expiring batches)
- **Reports** — deeper aggregations (daily sales, shift summary, stock valuation)
- **POS / Sales** — source of revenue figures
- **Shifts** — source of active shift data
