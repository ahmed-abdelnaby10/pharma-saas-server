# Reports Module

## Purpose

Read-only aggregation reports for branch managers and tenant admins. Three report types:

1. **Shift Summary** — revenue, VAT, sale count, and payment-method breakdown for a single shift
2. **Daily Sales** — completed sales grouped by calendar day over a date range
3. **Stock Valuation** — total inventory value at a branch based on `quantityOnHand × sellingPrice`

---

## Dependencies

- **`Sale`** / **`Payment`** — shift summary, daily sales aggregation
- **`InventoryItem`** → **`CatalogItem`** — stock valuation with product names
- **`Shift`** → **`TenantUser`** — cashier name in shift summary
- **Auth middleware** + **Tenant middleware** — all routes require a tenant-scoped JWT

---

## Endpoints

### `GET /tenant/reports/shift-summary`

Aggregate totals for a single shift: sale count, subtotal, VAT, total revenue, and payment-method breakdown. Only `COMPLETED` sales are counted; cancelled sales appear as `cancelledCount`.

**Query Parameters**

| Param | Type | Required |
|-------|------|----------|
| `shiftId` | `CUID` | **Yes** |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "shiftId": "cuid",
    "branchId": "cuid",
    "cashierName": "Ahmed Ali",
    "openedAt": "2026-04-19T08:00:00.000Z",
    "closedAt": "2026-04-19T16:00:00.000Z",
    "status": "CLOSED",
    "openingBalance": "500.00",
    "closingBalance": "1250.75",
    "saleCount": 42,
    "cancelledCount": 1,
    "subtotal": "3800.00",
    "vatAmount": "570.00",
    "total": "4370.00",
    "paymentBreakdown": [
      { "paymentMethod": "CASH", "totalAmount": "2500.00", "transactionCount": 28 },
      { "paymentMethod": "CARD", "totalAmount": "1870.00", "transactionCount": 14 }
    ]
  }
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `report.shift_not_found` |

---

### `GET /tenant/reports/daily-sales`

Completed sales aggregated by calendar day (UTC date) over a date range. Includes per-day rows and a totals summary.

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `CUID` | **Yes** | Branch to report on |
| `from` | `ISO 8601 datetime` | **Yes** | Range start (inclusive) |
| `to` | `ISO 8601 datetime` | **Yes** | Range end (inclusive) |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "branchId": "cuid",
    "from": "2026-04-01T00:00:00.000Z",
    "to": "2026-04-30T23:59:59.000Z",
    "rows": [
      {
        "date": "2026-04-19",
        "saleCount": 42,
        "subtotal": "3800.00",
        "vatAmount": "570.00",
        "total": "4370.00"
      }
    ],
    "totals": {
      "saleCount": 42,
      "subtotal": "3800.00",
      "vatAmount": "570.00",
      "total": "4370.00"
    }
  }
}
```

---

### `GET /tenant/reports/stock-valuation`

Current inventory value at a branch. For each active item: `lineValue = quantityOnHand × sellingPrice`. Items without a `sellingPrice` have `lineValue: null` and are excluded from `totalValue`.

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
    "totalValue": "48250.00",
    "itemCount": 85,
    "rows": [
      {
        "inventoryItemId": "cuid",
        "catalogItemId": "cuid",
        "catalogNameEn": "Paracetamol 500mg",
        "catalogNameAr": "باراسيتامول 500 مجم",
        "quantityOnHand": "500.000",
        "sellingPrice": "12.50",
        "lineValue": "6250.00"
      }
    ]
  }
}
```

---

## Permissions

All endpoints require a valid tenant JWT. `tenantId` is always taken from the JWT — never from the request body or query string.

---

## Tenant / Branch Scope

- All data is scoped by `tenantId` from JWT.
- `branchId` or `shiftId` scopes each report to a specific branch or shift belonging to the tenant.

---

## Side Effects

None — all endpoints are read-only.

---

## Related Modules

- **Shifts** — shift summary reports reference shift + cashier data
- **POS / Sales** — source of sale and payment records
- **Inventory** — source of `quantityOnHand` and `sellingPrice` for stock valuation
- **Dashboard** (future) — KPI cards consume these report endpoints
