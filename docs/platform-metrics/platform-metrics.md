# Platform Metrics

## Purpose

Read-only aggregation endpoints that surface high-level operational health data for platform admins — tenant counts by status, subscription distribution, invoice revenue, and support ticket queue state.

## Dependencies

- `authMiddleware`, `platformMiddleware` — all endpoints are platform-admin only
- `Tenant`, `Subscription`, `PlatformInvoice`, `SupportTicket` Prisma models
- No writes; pure aggregation via Prisma `groupBy` and `aggregate`

## Platform Admin Endpoints (`/platform/metrics`)

All endpoints require `Authorization: Bearer <platformToken>`.

---

### `GET /platform/metrics/overview`

Snapshot of all core operational metrics in one call.

**Response `200`**

```json
{
  "tenants": {
    "total": 42,
    "active": 35,
    "suspended": 4,
    "inactive": 3
  },
  "subscriptions": {
    "total": 40,
    "active": 30,
    "trialing": 6,
    "pastDue": 2,
    "canceled": 1,
    "expired": 1
  },
  "invoices": {
    "totalPaid": 120,
    "totalRevenue": "84000.00",
    "outstanding": "12500.00",
    "overdueAmount": "3200.00"
  },
  "support": {
    "open": 5,
    "inProgress": 3,
    "resolved": 89,
    "closed": 20
  }
}
```

---

### `GET /platform/metrics/tenants`

Tenant-focused metrics with recent growth signals.

**Response `200`**

```json
{
  "byStatus": {
    "active": 35,
    "suspended": 4,
    "inactive": 3
  },
  "newLast30Days": 8,
  "newLast7Days": 2
}
```

---

### `GET /platform/metrics/revenue`

Invoice revenue breakdown grouped by status.

**Response `200`**

```json
{
  "byStatus": {
    "PAID":    { "count": 120, "total": "84000.00" },
    "ISSUED":  { "count": 15,  "total": "9300.00"  },
    "OVERDUE": { "count": 5,   "total": "3200.00"  },
    "DRAFT":   { "count": 3,   "total": "1800.00"  },
    "VOID":    { "count": 2,   "total": "1000.00"  }
  },
  "totalRevenue": "84000.00",
  "outstandingAmount": "12500.00"
}
```

`outstandingAmount` = sum of ISSUED + OVERDUE invoices.

## Permissions

Platform admin only. No tenant scoping — metrics span all tenants.

## Side Effects

None — all endpoints are read-only.

## Related Modules

- **Platform Invoices** — revenue figures sourced from `PlatformInvoice`
- **Support** — ticket queue counts sourced from `SupportTicket`
- **Tenants** — tenant status counts sourced from `Tenant`
- **Subscriptions** — subscription distribution sourced from `Subscription`
