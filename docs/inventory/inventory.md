# Inventory Module

## Purpose

Manages the inventory of pharmacy products at the branch level. An `InventoryItem` is the operational record that links a global `CatalogItem` to a specific `Branch`, carrying branch-specific data: selling price, reorder level, and a cached `quantityOnHand`. Quantity is updated atomically by the Stock Movements module (future slice); this module governs registration and configuration of each item slot.

---

## Dependencies

- **`CatalogItem`** — global product master managed by the platform; a catalog item must exist and be active before it can be registered in inventory
- **`Branch`** — inventory items are branch-scoped; branch must belong to the authenticated tenant
- **`Tenant`** — cascade delete parent
- **Auth middleware** + **Tenant middleware** — all routes require a tenant-scoped JWT
- **Stock Movements** (future) — will update `quantityOnHand` via atomic writes; direct quantity edits are not exposed in this slice

---

## Endpoints

### `GET /tenant/inventory`

List inventory items for a specific branch.

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <access_token>` |
| `Accept-Language` | No | `en` or `ar` (default: `en`) |

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `string (CUID)` | **Yes** | Branch to list inventory for |
| `isActive` | `boolean` | No | Filter by active/inactive status |
| `lowStock` | `boolean` | No | When `true`, returns only items where `quantityOnHand <= reorderLevel` (and `reorderLevel` is set) |
| `search` | `string` | No | Case-insensitive search across catalog `nameEn`, `nameAr`, `genericNameEn`, `genericNameAr`, `barcode`, `sku` |

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
      "catalogItemId": "cuid",
      "catalogItem": {
        "id": "cuid",
        "nameEn": "Paracetamol 500mg",
        "nameAr": "باراسيتامول 500 مجم",
        "genericNameEn": "Paracetamol",
        "genericNameAr": "باراسيتامول",
        "barcode": "6281234567890",
        "sku": "PCM-500",
        "category": "Analgesic",
        "unitOfMeasure": "Strip",
        "dosageForm": "Tablet",
        "strength": "500mg",
        "manufacturer": "SPIMACO"
      },
      "quantityOnHand": "120.000",
      "reorderLevel": "20.000",
      "sellingPrice": "5.50",
      "isActive": true,
      "createdAt": "2026-04-18T00:00:00.000Z",
      "updatedAt": "2026-04-18T00:00:00.000Z"
    }
  ],
  "requestId": "uuid"
}
```

---

### `POST /tenant/inventory`

Register a catalog item in a branch's inventory. Creates the inventory slot with `quantityOnHand = 0`.

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <access_token>` |
| `Content-Type` | Yes | `application/json` |
| `Accept-Language` | No | `en` or `ar` |

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `string (CUID)` | **Yes** | Target branch (must belong to tenant) |
| `catalogItemId` | `string (CUID)` | **Yes** | Global catalog item to register |
| `reorderLevel` | `number` | No | Quantity threshold for low-stock alerts |
| `sellingPrice` | `number` | No | Branch selling price |

**Response `201`**

```json
{
  "success": true,
  "message": "Inventory item registered successfully",
  "data": { ...inventoryItem },
  "requestId": "uuid"
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `409 Conflict` | `inventory.duplicate` — catalog item already registered at this branch |
| `404 Not Found` | `catalog.not_found` — catalog item does not exist or is inactive |
| `403 Forbidden` | Branch does not belong to the authenticated tenant |

---

### `GET /tenant/inventory/:itemId`

Retrieve a single inventory item by ID.

**Path Parameters**

| Param | Description |
|-------|-------------|
| `itemId` | CUID of the inventory item |

**Response `200`** — same shape as list item above.

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `inventory.not_found` |

---

### `PATCH /tenant/inventory/:itemId`

Update branch-specific configuration. Quantity is not editable here — use Stock Movements. All fields are optional; at least one must be provided.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reorderLevel` | `number \| null` | No | New reorder threshold (null to clear) |
| `sellingPrice` | `number \| null` | No | New selling price (null to clear) |
| `isActive` | `boolean` | No | Toggle active status |

**Response `200`**

```json
{
  "success": true,
  "message": "Inventory item updated successfully",
  "data": { ...inventoryItem },
  "requestId": "uuid"
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `inventory.not_found` |
| `400 Bad Request` | No fields provided |

---

### `DELETE /tenant/inventory/:itemId`

Soft-deactivate an inventory item (`isActive = false`).

**Response `200`**

```json
{
  "success": true,
  "message": "Inventory item deactivated successfully",
  "data": { ...inventoryItem },
  "requestId": "uuid"
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `inventory.not_found` |
| `409 Conflict` | `inventory.already_inactive` |

---

## Permissions

All endpoints require a valid tenant JWT. Granular RBAC permission codes will be enforced when the permission guard middleware is wired up.

---

## Tenant / Branch Scope

- All operations are scoped to `tenantId` from the JWT.
- `branchId` must belong to the authenticated tenant (validated on list and create).
- Each catalog item may appear at most once per branch (`@@unique([branchId, catalogItemId])`).

---

## Side Effects

- None in this slice. In future slices, Stock Movements will update `quantityOnHand` atomically and trigger low-stock alerts.

---

## Related Modules

- **Global Catalog** — source of `CatalogItem` records
- **Branches** — defines valid `branchId` values
- **Inventory Batches** (next) — batch-level detail per inventory item (expiry, lot numbers)
- **Stock Movements** (future) — every quantity change is tracked as a movement
- **Purchasing** (future) — purchase order receipts update quantity via movements
- **POS / Sales** (future) — sales reduce quantity via movements
- **Alerts** (future) — low-stock threshold triggers notifications
