# Platform Admin Dashboard Analytics

## Purpose

Single-endpoint data feed for the platform admin dashboard. Returns all the data needed to render the top-level admin overview in one round-trip: key performance indicators, subscription health breakdown, 6-month revenue and tenant growth trends, and the 10 most recent audit log entries.

## Dependencies

- `authMiddleware`, `platformMiddleware` — platform-admin only
- `Tenant`, `Subscription`, `PlatformInvoice`, `SupportTicket`, `AuditLog` Prisma models
- No schema migration required (reuses existing models)

## Platform Admin Endpoint

### `GET /platform/dashboard`

Returns a curated analytics snapshot optimised for a single page load.

**Headers**

| Header | Value |
|---|---|
| `Authorization` | `Bearer <platformToken>` |

**Response `200`**

```json
{
  "data": {
    "kpis": {
      "totalTenants": 42,
      "activeTenants": 35,
      "newTenantsLast30Days": 8,
      "newTenantsLast7Days": 2,
      "totalRevenue": "84000.00",
      "overdueAmount": "3200.00",
      "overdueCount": 5,
      "openTickets": 8,
      "urgentTickets": 2
    },
    "subscriptionHealth": {
      "active": 30,
      "trialing": 6,
      "pastDue": 2,
      "canceled": 1,
      "expired": 1
    },
    "revenueTrend": [
      { "month": "2025-11", "value": 11200.00 },
      { "month": "2025-12", "value": 14300.00 },
      { "month": "2026-01", "value": 13800.00 },
      { "month": "2026-02", "value": 15100.00 },
      { "month": "2026-03", "value": 16200.00 },
      { "month": "2026-04", "value": 13400.00 }
    ],
    "tenantGrowthTrend": [
      { "month": "2025-11", "value": 3 },
      { "month": "2025-12", "value": 5 },
      { "month": "2026-01", "value": 4 },
      { "month": "2026-02", "value": 7 },
      { "month": "2026-03", "value": 6 },
      { "month": "2026-04", "value": 8 }
    ],
    "recentActivity": [
      {
        "id": "clx...",
        "tenantId": "clx...",
        "actorId": "clx...",
        "actorType": "TENANT_USER",
        "action": "sale.create",
        "resource": "Sale",
        "resourceId": "clx...",
        "createdAt": "2026-04-23T12:00:00.000Z"
      }
    ]
  }
}
```

## Response Fields

### `kpis`

| Field | Description |
|---|---|
| `totalTenants` | All tenants regardless of status |
| `activeTenants` | Tenants with `status = active` |
| `newTenantsLast30Days` | Tenants created in the last 30 days |
| `newTenantsLast7Days` | Tenants created in the last 7 days |
| `totalRevenue` | Sum of all PAID invoice amounts (string/decimal) |
| `overdueAmount` | Sum of all OVERDUE invoice amounts (string/decimal) |
| `overdueCount` | Count of OVERDUE invoices |
| `openTickets` | Count of OPEN + IN_PROGRESS support tickets |
| `urgentTickets` | Count of URGENT priority OPEN + IN_PROGRESS tickets |

### `subscriptionHealth`

Counts by `SubscriptionStatus`: `active`, `trialing`, `pastDue`, `canceled`, `expired`.

### `revenueTrend`

Array of `{ month: "YYYY-MM", value: number }` for the last 6 calendar months. `value` is total paid revenue (float, 2dp) for that month, based on `paidAt` date. Empty months are included with `value: 0`.

### `tenantGrowthTrend`

Array of `{ month: "YYYY-MM", value: number }` for the last 6 calendar months. `value` is new tenants created in that month. Empty months are included with `value: 0`.

### `recentActivity`

The 10 most recent `AuditLog` entries across all tenants. Fields: `id`, `tenantId`, `actorId`, `actorType`, `action`, `resource`, `resourceId`, `createdAt`.

## Permissions

Platform admin only (`authMiddleware` + `platformMiddleware`). No tenant scoping.

## Side Effects

None — read-only aggregation.

## Related Modules

- **Platform Metrics** — granular breakdowns with additional filters (`/platform/metrics/*`)
- **Audit Explorer** — full paginated audit log (`/platform/audit`)
- **Platform Invoices** — source of revenue figures
- **Support** — source of ticket counts
