# Analytics Module

## Purpose

Trend and composition analytics for branch managers. Three endpoints:

1. **Top Items** — best-selling inventory items by quantity sold over a date range
2. **Revenue Trend** — completed-sale revenue grouped by day or ISO week
3. **Payment Methods** — payment method distribution with percentage breakdown

All computations are over `COMPLETED` sales only. Cancelled sales are excluded.

---

## Dependencies

- **`SaleItem`** → `InventoryItem` → `CatalogItem` — top items with product names
- **`Sale`** — revenue trend aggregation
- **`Payment`** — payment method groupBy
- **Auth middleware** + **Tenant middleware** — all routes require a tenant-scoped JWT

---

## Endpoints

### `GET /tenant/analytics/top-items`

Top-selling inventory items by total quantity sold, with revenue and transaction count.

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `CUID` | **Yes** | Branch to analyse |
| `from` | `ISO 8601 datetime` | **Yes** | Range start (inclusive) |
| `to` | `ISO 8601 datetime` | **Yes** | Range end (inclusive) |
| `limit` | `integer 1–50` | No | Number of items to return (default: `10`) |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "meta": { "count": 3 },
  "data": {
    "branchId": "cuid",
    "from": "2026-04-01T00:00:00.000Z",
    "to": "2026-04-30T23:59:59.000Z",
    "rows": [
      {
        "rank": 1,
        "inventoryItemId": "cuid",
        "catalogItemId": "cuid",
        "catalogNameEn": "Paracetamol 500mg",
        "catalogNameAr": "باراسيتامول 500 مجم",
        "totalQuantitySold": "420.000",
        "totalRevenue": "5250.00",
        "transactionCount": 38
      }
    ]
  }
}
```

---

### `GET /tenant/analytics/revenue-trend`

Revenue and sale count grouped by day or ISO week.

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `CUID` | **Yes** | |
| `from` | `ISO 8601 datetime` | **Yes** | |
| `to` | `ISO 8601 datetime` | **Yes** | |
| `granularity` | `day \| week` | No | Default: `day` |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "meta": { "count": 30 },
  "data": {
    "branchId": "cuid",
    "from": "2026-04-01T00:00:00.000Z",
    "to": "2026-04-30T23:59:59.000Z",
    "granularity": "day",
    "rows": [
      {
        "period": "2026-04-19",
        "saleCount": 42,
        "revenue": "4370.00",
        "vatAmount": "570.00"
      }
    ]
  }
}
```

**Period format**
- `granularity: "day"` → `YYYY-MM-DD`
- `granularity: "week"` → `YYYY-Www` (ISO 8601 week, e.g. `2026-W16`)

---

### `GET /tenant/analytics/payment-methods`

Payment method breakdown with percentage of total revenue.

**Query Parameters**

| Param | Type | Required |
|-------|------|----------|
| `branchId` | `CUID` | **Yes** |
| `from` | `ISO 8601 datetime` | **Yes** |
| `to` | `ISO 8601 datetime` | **Yes** |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "branchId": "cuid",
    "from": "2026-04-01T00:00:00.000Z",
    "to": "2026-04-30T23:59:59.000Z",
    "grandTotal": "38640.00",
    "rows": [
      { "paymentMethod": "CASH",      "transactionCount": 210, "totalAmount": "22400.00", "percentage": "57.97" },
      { "paymentMethod": "CARD",      "transactionCount": 85,  "totalAmount": "12840.00", "percentage": "33.23" },
      { "paymentMethod": "INSURANCE", "transactionCount": 17,  "totalAmount": "3400.00",  "percentage": "8.80"  }
    ]
  }
}
```

Rows are sorted by `totalAmount` descending.

---

## Permissions

All endpoints require a valid tenant JWT. `tenantId` is always taken from the JWT.

---

## Tenant / Branch Scope

All data is scoped by `tenantId` from JWT and `branchId` from the query string.

---

## Side Effects

None — all endpoints are read-only.

---

## Related Modules

- **POS / Sales** — source of sale, payment, and line-item data
- **Dashboard** — real-time KPIs; analytics provides deeper trend data
- **Reports** — shift-level and stock reports (complementary to analytics)
