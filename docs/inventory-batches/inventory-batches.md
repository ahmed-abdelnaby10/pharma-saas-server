# Inventory Batches Module

## Purpose

Tracks pharmaceutical stock at the individual batch (lot) level within a branch inventory item. Each batch carries a manufacturer lot number, expiry date, per-unit cost price, an optional supplier reference, and its own `quantityOnHand`. Batch creation atomically increments the parent `InventoryItem.quantityOnHand` via a database transaction.

Batch-level tracking enables:
- FEFO (first-expired-first-out) dispensing logic
- Expiry date alerts and compliance
- Traceability by lot number
- Accurate cost-of-goods calculations

---

## Dependencies

- **`InventoryItem`** — parent; must belong to the authenticated tenant
- **`Supplier`** — optional reference; must belong to the same tenant if provided
- **`Tenant`** — cascade delete parent
- **Auth middleware** + **Tenant middleware** — all routes require a tenant-scoped JWT
- **`$transaction`** — batch create atomically increments `InventoryItem.quantityOnHand`
- **Stock Movements** (future) — will decrement `quantityOnHand` at both batch and item level

---

## Endpoints

All routes are nested under `/tenant/inventory/:itemId/batches`.

### `GET /tenant/inventory/:itemId/batches`

List all batches for an inventory item, ordered by expiry date ascending (FEFO order).

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <access_token>` |
| `Accept-Language` | No | `en` or `ar` |

**Path Parameters**

| Param | Description |
|-------|-------------|
| `itemId` | CUID of the parent `InventoryItem` |

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `isActive` | `boolean` | No | Filter by active/inactive status |
| `expiringSoonDays` | `integer` | No | Return active batches expiring within N days from now |

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
      "supplierId": "cuid",
      "supplier": {
        "id": "cuid",
        "nameEn": "MediCo Pharma",
        "nameAr": "ميديكو فارما"
      },
      "batchNumber": "LOT-2026-001",
      "expiryDate": "2027-06-30T00:00:00.000Z",
      "quantityReceived": "500.000",
      "quantityOnHand": "500.000",
      "costPrice": "3.75",
      "isActive": true,
      "createdAt": "2026-04-19T00:00:00.000Z",
      "updatedAt": "2026-04-19T00:00:00.000Z"
    }
  ],
  "requestId": "uuid"
}
```

---

### `POST /tenant/inventory/:itemId/batches`

Register a new batch for an inventory item. Atomically increments `InventoryItem.quantityOnHand` by `quantityReceived`.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `batchNumber` | `string` | **Yes** | Manufacturer lot / batch number (unique per item) |
| `expiryDate` | `string (ISO 8601)` | **Yes** | Expiry date — must be in the future |
| `quantityReceived` | `number` | **Yes** | Quantity received in this batch (positive) |
| `costPrice` | `number` | No | Per-unit cost price |
| `supplierId` | `string (CUID)` | No | Supplier this batch came from (must belong to tenant) |

**Response `201`**

```json
{
  "success": true,
  "message": "Batch registered successfully",
  "data": { ...batch },
  "requestId": "uuid"
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `409 Conflict` | `inventory_batch.duplicate` — batch number already exists for this item |
| `404 Not Found` | `supplier.not_found` — supplierId not found or not in this tenant |
| `403 Forbidden` | `itemId` does not belong to this tenant |
| `400 Bad Request` | `expiryDate` is in the past, `quantityReceived` is not positive |

---

### `GET /tenant/inventory/:itemId/batches/:batchId`

Retrieve a single batch by ID.

**Path Parameters**

| Param | Description |
|-------|-------------|
| `itemId` | CUID of the parent `InventoryItem` |
| `batchId` | CUID of the batch |

**Response `200`** — same shape as list item above.

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `inventory_batch.not_found` |

---

### `PATCH /tenant/inventory/:itemId/batches/:batchId`

Update batch metadata. Quantity is not editable — use Stock Movements. At least one field must be provided.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `expiryDate` | `string (ISO 8601)` | No | Corrected expiry date |
| `costPrice` | `number \| null` | No | Updated cost price (null to clear) |
| `supplierId` | `string \| null` | No | Updated supplier reference (null to clear) |

**Response `200`**

```json
{
  "success": true,
  "message": "Batch updated successfully",
  "data": { ...batch },
  "requestId": "uuid"
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `inventory_batch.not_found` |
| `400 Bad Request` | No fields provided |

---

### `DELETE /tenant/inventory/:itemId/batches/:batchId`

Soft-deactivate a batch (`isActive = false`). Does **not** adjust `InventoryItem.quantityOnHand` — quantity reconciliation is handled by Stock Movements.

**Response `200`**

```json
{
  "success": true,
  "message": "Batch deactivated successfully",
  "data": { ...batch },
  "requestId": "uuid"
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `inventory_batch.not_found` |
| `409 Conflict` | `inventory_batch.already_inactive` |

---

## Permissions

All endpoints require a valid tenant JWT. Granular RBAC enforcement will be added when the permission guard middleware is wired up.

---

## Tenant / Branch Scope

- All operations validate that the parent `InventoryItem` belongs to the authenticated tenant.
- `supplierId` is validated to belong to the same tenant.
- Batches inherit `branchId` from the parent inventory item.

---

## Side Effects

- **`POST`** — atomically increments `InventoryItem.quantityOnHand` by `quantityReceived` in a single `$transaction`.
- **`DELETE`** — sets `isActive = false` only; does not adjust item quantity. A separate stock adjustment movement should be created if needed.

---

## Related Modules

- **Inventory** — parent module; `InventoryItem` holds the aggregate `quantityOnHand`
- **Suppliers** — optional batch-level supplier attribution
- **Stock Movements** (future) — decrements `quantityOnHand` at both batch and item level on dispensing/sale
- **Purchasing** (future) — purchase order receipts may auto-create batches
- **Alerts** (future) — expiry-based alerts use `expiryDate` from this module
- **Reports** (future) — expiry reports aggregate batch data
