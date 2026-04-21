# POS / Sales Module

## Purpose

Processes point-of-sale transactions at a branch. Each sale is gated behind an open shift. Items are deducted from inventory using FEFO (first-expired-first-out) batch selection. VAT is applied from tenant settings. A single payment record is created per sale.

---

## Dependencies

- **`Shift`** — sale must reference an OPEN shift at the same branch
- **`InventoryItem`** — stock is validated and decremented per line item
- **`InventoryBatch`** — FEFO batch selection drives OUTBOUND stock movements
- **`StockMovement`** — one OUTBOUND movement created per batch consumed
- **`Payment`** — single payment record per sale (CASH / CARD / INSURANCE)
- **`TenantSettings`** — `vatPercentage` pulled at sale time
- **Auth middleware** + **Tenant middleware** — all routes require a tenant-scoped JWT

---

## Endpoints

### `GET /tenant/pos`

List sales for a branch, newest first.

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `CUID` | **Yes** | Branch to query |
| `shiftId` | `CUID` | No | Filter by shift |
| `status` | `COMPLETED \| CANCELLED` | No | Filter by status |
| `from` | `ISO 8601 datetime` | No | Filter by createdAt >= from |
| `to` | `ISO 8601 datetime` | No | Filter by createdAt <= to |

**Response `200`** — array of sale objects.

---

### `POST /tenant/pos`

Create a completed sale. Validates the shift is open, resolves FEFO batches, and atomically records the sale, stock movements, and payment in a single transaction.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `CUID` | **Yes** | Branch where the sale occurs |
| `shiftId` | `CUID` | **Yes** | Open shift at the branch |
| `items` | `SaleLineDto[]` | **Yes** | At least one line item |
| `items[].inventoryItemId` | `CUID` | **Yes** | Inventory item to sell |
| `items[].quantity` | `number` | **Yes** | Quantity (positive) |
| `items[].unitPrice` | `number` | **Yes** | Selling price per unit |
| `paymentMethod` | `CASH \| CARD \| INSURANCE` | **Yes** | Payment method |
| `paymentAmount` | `number` | **Yes** | Amount tendered (must cover total) |
| `paymentReference` | `string \| null` | No | Card ref / insurance claim number |
| `notes` | `string \| null` | No | Sale notes |

**Response `201`**

```json
{
  "success": true,
  "message": "Sale completed successfully",
  "data": {
    "id": "cuid",
    "tenantId": "cuid",
    "branchId": "cuid",
    "shiftId": "cuid",
    "saleNumber": "SALE-LPZ4R7KQ",
    "status": "COMPLETED",
    "subtotal": "120.00",
    "vatPercentage": "15.00",
    "vatAmount": "18.00",
    "total": "138.00",
    "notes": null,
    "items": [
      {
        "id": "cuid",
        "inventoryItemId": "cuid",
        "quantity": "2.000",
        "unitPrice": "60.00",
        "subtotal": "120.00"
      }
    ],
    "payments": [
      {
        "id": "cuid",
        "paymentMethod": "CASH",
        "amount": "150.00",
        "reference": null,
        "createdAt": "2026-04-19T10:00:00.000Z"
      }
    ],
    "createdAt": "2026-04-19T10:00:00.000Z",
    "updatedAt": "2026-04-19T10:00:00.000Z"
  }
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `400 Bad Request` | `sale.shift_not_open` — shift is not OPEN |
| `400 Bad Request` | `sale.insufficient_stock` — not enough stock for one or more items |
| `400 Bad Request` | `sale.payment_shortfall` — payment amount < total |
| `404 Not Found` | `sale.not_found` — shift or item not found at branch |
| `422 Unprocessable Entity` | Validation errors |

---

### `GET /tenant/pos/:saleId`

Retrieve a single sale by ID, including items and payments.

**Response `200`** — sale object (same shape as above).

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `sale.not_found` |

---

### `GET /tenant/pos/:saleId/receipt`

Return a print-ready receipt payload for a sale. Combines the sale data with tenant branding (from `TenantSettings`), branch details, and product names (from `CatalogItem` via `InventoryItem`). Intended as the data source for receipt printing at the POS terminal.

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "organizationName": "Al-Shifa Pharmacy",
    "taxId": "300000000000003",
    "receiptHeader": "Thank you for choosing Al-Shifa!",
    "receiptFooter": "Returns accepted within 7 days with receipt.",
    "branch": {
      "id": "cuid",
      "nameEn": "Main Branch",
      "nameAr": "الفرع الرئيسي",
      "address": "King Fahd Road, Riyadh",
      "phone": "+966-11-000-0000"
    },
    "cashier": { "id": "cuid", "fullName": "Ahmed Ali" },
    "id": "cuid",
    "saleNumber": "SALE-LPZ4R7KQ",
    "status": "COMPLETED",
    "subtotal": "120.00",
    "vatPercentage": "15.00",
    "vatAmount": "18.00",
    "total": "138.00",
    "notes": null,
    "items": [
      {
        "id": "cuid",
        "inventoryItemId": "cuid",
        "nameEn": "Paracetamol 500mg",
        "nameAr": "باراسيتامول 500 مجم",
        "unitOfMeasure": "tablet",
        "quantity": "2.000",
        "unitPrice": "60.00",
        "subtotal": "120.00"
      }
    ],
    "payments": [
      {
        "id": "cuid",
        "paymentMethod": "CASH",
        "amount": "150.00",
        "reference": null,
        "createdAt": "2026-04-19T10:00:00.000Z"
      }
    ],
    "issuedAt": "2026-04-19T10:00:00.000Z"
  }
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `sale.not_found` |

---

### `POST /tenant/pos/:saleId/return`

Cancel a completed sale and reverse all inventory changes. Restores stock to the batches that were originally consumed (identified via `StockMovement` records with `referenceType: "sale"`), creates `RETURN_IN` stock movements, and transitions the sale status to `CANCELLED`.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notes` | `string \| null` | No | Reason for return |

**Response `200`** — updated sale object with `status: "CANCELLED"`.

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `sale.not_found` |
| `409 Conflict` | `sale.already_cancelled` — sale is already cancelled |

---

## Permissions

All endpoints require a valid tenant JWT. `tenantId` is taken from the JWT — never from the request body.

---

## Tenant / Branch Scope

- All data is scoped to `tenantId` from JWT.
- `branchId` and `shiftId` must belong to the tenant.
- FEFO batch selection is scoped to `tenantId + branchId + inventoryItemId`.

---

## Business Logic

### FEFO Batch Selection

For each sale line item:
1. All active (`isActive: true`) batches with `quantityOnHand > 0` are retrieved, sorted by `expiryDate ASC`.
2. Batches are consumed greedily in order until the line quantity is satisfied.
3. If remaining quantity after consuming all available batches is still `> 0`, the sale is rejected with `sale.insufficient_stock`.

### VAT

VAT percentage is read from `TenantSettings.vatPercentage`. If not set, defaults to `0`. VAT amount = `subtotal × (vatPercentage / 100)`, rounded to 2 decimal places.

### Payment Validation

`paymentAmount` must be `>=` the computed `total`. Change is not tracked (handled by the POS terminal).

### Transaction Atomicity

The entire sale creation (Sale record, SaleItem records, Payment record, InventoryBatch `quantityOnHand` updates, InventoryItem `quantityOnHand` updates, and StockMovement records) is wrapped in a single Prisma `$transaction`.

---

## Side Effects

- `InventoryBatch.quantityOnHand` decremented per batch consumed.
- `InventoryItem.quantityOnHand` decremented per line item.
- One `StockMovement` (type: `OUTBOUND`) created per batch consumed, with `referenceType: "sale"` and `referenceId: <saleId>`.

**On return (`POST /:saleId/return`):**
- `InventoryBatch.quantityOnHand` incremented for each batch that was originally consumed.
- `InventoryItem.quantityOnHand` incremented per line item.
- One `StockMovement` (type: `RETURN_IN`) created per batch, with `referenceType: "sale_return"` and `referenceId: <saleId>`.
- Sale `status` set to `CANCELLED`.

---

## Related Modules

- **Shifts** — sale requires an OPEN shift
- **Inventory** — stock levels are checked and decremented
- **Inventory Batches** — FEFO selection drives batch-level stock movements
- **Stock Movements** — OUTBOUND movements created per batch consumed
- **Settings** — VAT percentage sourced from tenant settings
- **Reports** (future) — shift totals, daily revenue summaries
