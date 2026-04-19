# Stock Movements Module

## Purpose

Append-only audit log of every inventory quantity change at a branch. Each movement atomically adjusts `InventoryItem.quantityOnHand` (and optionally `InventoryBatch.quantityOnHand`) inside a single `$transaction`, capturing `quantityBefore` and `quantityAfter` for a complete, immutable audit trail.

Movement types:
| Type | Direction | Description |
|------|-----------|-------------|
| `INBOUND` | + | Stock received (typically from a purchase order) |
| `OUTBOUND` | - | Stock dispensed (typically from a sale) |
| `ADJUSTMENT_IN` | + | Manual positive adjustment |
| `ADJUSTMENT_OUT` | - | Manual negative adjustment |
| `RETURN_IN` | + | Customer return received back into stock |
| `RETURN_OUT` | - | Stock returned to supplier |

Movements are **never updated or deleted**. Future modules (Purchasing, POS/Sales) will call the service layer directly to create `INBOUND` and `OUTBOUND` movements as part of their own transactions. This API exposes manual adjustments and the list (audit) endpoint.

---

## Dependencies

- **`InventoryItem`** — quantity target; must belong to the authenticated tenant
- **`InventoryBatch`** — optional batch-level target; must belong to the same inventory item
- **`Branch`** — must belong to the authenticated tenant
- **Auth middleware** + **Tenant middleware** — all routes require a tenant-scoped JWT
- **`$transaction`** — all quantity updates are atomic with the movement record

---

## Endpoints

### `GET /tenant/stock-movements`

List stock movements for a branch, most recent first. Used for audit logs and reporting.

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <access_token>` |
| `Accept-Language` | No | `en` or `ar` |

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `string (CUID)` | **Yes** | Branch to query |
| `inventoryItemId` | `string (CUID)` | No | Filter by specific inventory item |
| `batchId` | `string (CUID)` | No | Filter by specific batch |
| `movementType` | `enum` | No | One of: `INBOUND`, `OUTBOUND`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `RETURN_IN`, `RETURN_OUT` |
| `from` | `ISO 8601 datetime` | No | Start of date range (inclusive) |
| `to` | `ISO 8601 datetime` | No | End of date range (inclusive) |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "cuid",
      "tenantId": "cuid",
      "branchId": "cuid",
      "inventoryItemId": "cuid",
      "batchId": "cuid",
      "movementType": "ADJUSTMENT_IN",
      "quantity": "50.000",
      "quantityBefore": "120.000",
      "quantityAfter": "170.000",
      "referenceType": "manual",
      "referenceId": null,
      "notes": "Stock count correction",
      "createdAt": "2026-04-19T08:00:00.000Z"
    }
  ],
  "requestId": "uuid"
}
```

---

### `POST /tenant/stock-movements`

Create a manual stock movement. Atomically updates `InventoryItem.quantityOnHand` (and `InventoryBatch.quantityOnHand` if `batchId` is provided). Use this for manual adjustments and corrections; purchasing and sales modules create movements automatically.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `string (CUID)` | **Yes** | Branch where movement occurs |
| `inventoryItemId` | `string (CUID)` | **Yes** | Affected inventory item |
| `batchId` | `string (CUID)` | No | Specific batch (updates batch qty too) |
| `movementType` | `enum` | **Yes** | Movement type (see table above) |
| `quantity` | `number` | **Yes** | Always positive — direction determined by type |
| `referenceType` | `string` | No | Source type label, e.g. `"manual"`, `"audit"` |
| `referenceId` | `string` | No | ID of source document (soft reference) |
| `notes` | `string` | No | Free-text notes (max 500 chars) |

**Response `201`**

```json
{
  "success": true,
  "message": "Stock movement recorded successfully",
  "data": { ...movement },
  "requestId": "uuid"
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `inventory.not_found` — inventory item not in tenant |
| `404 Not Found` | `inventory_batch.not_found` — batchId not found for this item |
| `403 Forbidden` | Branch does not belong to tenant |
| `409 Conflict` | `stock.insufficient_quantity` — outbound qty exceeds item stock |
| `409 Conflict` | `stock.insufficient_batch_quantity` — outbound qty exceeds batch stock |

---

## Permissions

All endpoints require a valid tenant JWT. Granular RBAC enforcement will be added when the permission guard middleware is wired up.

---

## Tenant / Branch Scope

- All operations validate branch ownership against `tenantId` from JWT.
- `inventoryItemId` and `batchId` are validated to belong to the authenticated tenant.
- `quantityBefore` / `quantityAfter` on the movement record always reflect `InventoryItem.quantityOnHand`, not batch quantity.

---

## Side Effects

- **`POST`** — atomically via `$transaction`:
  1. Updates `InventoryItem.quantityOnHand` (increment or decrement)
  2. Updates `InventoryBatch.quantityOnHand` if `batchId` provided
  3. Inserts `StockMovement` record

Movements are **never rolled back individually** once committed. Corrections are made with a subsequent movement in the opposite direction.

---

## Related Modules

- **Inventory** — holds aggregate `quantityOnHand` updated by movements
- **Inventory Batches** — holds batch-level `quantityOnHand` updated by movements
- **Purchasing** (future) — purchase order receipts create `INBOUND` movements
- **POS / Sales** (future) — sales create `OUTBOUND` movements
- **Alerts** (future) — low-stock alerts triggered after outbound movements
- **Reports** (future) — aggregate movement data for stock value and turnover reports
