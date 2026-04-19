# Purchasing Module

## Purpose

Manages purchase orders from pharmaceutical suppliers. A purchase order moves through a status lifecycle and culminates in a receive operation that atomically creates inventory batches, records `INBOUND` stock movements, and updates inventory quantities — all inside a single `$transaction`.

**Status lifecycle:**
```
DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED
  ↓         ↓
CANCELLED  CANCELLED
```

---

## Dependencies

- **`Supplier`** — optional order-level supplier reference (must belong to tenant)
- **`InventoryItem`** — each line item references an item at the same branch
- **`InventoryBatch`** — created or incremented on receive
- **`StockMovement.createInTransaction`** — INBOUND movement recorded on receive
- **`Branch`** + **`Tenant`** — scope guards on all operations
- **Auth middleware** + **Tenant middleware** — all routes require a tenant-scoped JWT

---

## Endpoints

### `GET /tenant/purchasing/orders`

List purchase orders for a branch.

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `CUID` | **Yes** | Branch to query |
| `status` | `enum` | No | `DRAFT \| ORDERED \| PARTIALLY_RECEIVED \| RECEIVED \| CANCELLED` |
| `supplierId` | `CUID` | No | Filter by supplier |

**Response `200`** — array of purchase order objects with embedded items.

---

### `POST /tenant/purchasing/orders`

Create a new purchase order in `DRAFT` status. Line items are added separately.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `CUID` | **Yes** | Target branch |
| `supplierId` | `CUID \| null` | No | Supplier reference |
| `orderNumber` | `string` | No | Custom order number (auto-generated if omitted) |
| `notes` | `string \| null` | No | Free-text notes |
| `expectedAt` | `ISO 8601` | No | Expected delivery date |

**Response `201`** — created purchase order.

**Errors:** `409` duplicate orderNumber.

---

### `GET /tenant/purchasing/orders/:orderId`

Retrieve a single purchase order with all line items.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": "cuid",
    "tenantId": "cuid",
    "branchId": "cuid",
    "supplierId": "cuid",
    "supplier": { "id": "cuid", "nameEn": "MediCo Pharma", "nameAr": "ميديكو فارما" },
    "orderNumber": "PO-LJK4A2",
    "status": "DRAFT",
    "notes": null,
    "orderedAt": null,
    "expectedAt": "2026-05-01T00:00:00.000Z",
    "items": [
      {
        "id": "cuid",
        "inventoryItemId": "cuid",
        "inventoryItem": {
          "id": "cuid",
          "catalogItem": { "id": "cuid", "nameEn": "Paracetamol 500mg", "nameAr": "...", "unitOfMeasure": "Strip" }
        },
        "quantityOrdered": "100.000",
        "quantityReceived": "0.000",
        "unitCost": "3.50"
      }
    ],
    "createdAt": "2026-04-19T00:00:00.000Z",
    "updatedAt": "2026-04-19T00:00:00.000Z"
  }
}
```

---

### `PATCH /tenant/purchasing/orders/:orderId`

Update a `DRAFT` or `ORDERED` order. Also used to confirm a DRAFT to ORDERED.

**Request Body** (at least one field required)

| Field | Type | Description |
|-------|------|-------------|
| `supplierId` | `CUID \| null` | Update/clear supplier |
| `notes` | `string \| null` | Update/clear notes |
| `expectedAt` | `ISO 8601 \| null` | Update/clear expected date |
| `status` | `enum` | Transition: `DRAFT→ORDERED`, `DRAFT→CANCELLED`, `ORDERED→CANCELLED` |

Sets `orderedAt` automatically when `status: "ORDERED"`.

**Errors:** `409` if order not in editable status; `400` for invalid transition.

---

### `DELETE /tenant/purchasing/orders/:orderId`

Cancel an order. Cannot cancel `RECEIVED` or already `CANCELLED` orders.

---

### `POST /tenant/purchasing/orders/:orderId/items`

Add a line item to a `DRAFT` order.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `inventoryItemId` | `CUID` | **Yes** | Must belong to tenant + same branch as order |
| `quantityOrdered` | `number` | **Yes** | Positive quantity |
| `unitCost` | `number \| null` | No | Estimated unit cost |

**Errors:** `409` if order not DRAFT or item already on order; `404` if item not in branch.

---

### `PATCH /tenant/purchasing/orders/:orderId/items/:poItemId`

Update quantity or unit cost on a DRAFT order line. At least one field required.

---

### `DELETE /tenant/purchasing/orders/:orderId/items/:poItemId`

Remove a line item from a DRAFT order.

---

### `POST /tenant/purchasing/orders/:orderId/receive`

Receive items. Requires order to be `ORDERED` or `PARTIALLY_RECEIVED`. For each received line:

1. Upserts `InventoryBatch` (creates if new batch number, increments qty if existing)
2. Increments `InventoryItem.quantityOnHand`
3. Creates an `INBOUND` stock movement
4. Updates `PurchaseOrderItem.quantityReceived`
5. Recalculates order status (`PARTIALLY_RECEIVED` or `RECEIVED`)

All in one `$transaction`.

**Request Body**

```json
{
  "items": [
    {
      "purchaseOrderItemId": "cuid",
      "quantityReceived": 100,
      "batchNumber": "LOT-2026-001",
      "expiryDate": "2027-06-30T00:00:00.000Z",
      "unitCost": 3.50
    }
  ]
}
```

**Response `200`** — updated purchase order with new quantities and status.

**Errors:** `409` if order not receivable; `404` if line item not on order.

---

## Tenant / Branch Scope

- Branch must belong to tenant on all operations.
- Inventory items on line items must belong to the same branch as the order.
- Supplier must belong to the tenant.

---

## Side Effects

- **`POST /receive`** atomically:
  - Upserts `InventoryBatch`
  - Updates `InventoryItem.quantityOnHand`
  - Inserts `StockMovement` (type: `INBOUND`, referenceType: `purchase_order`, referenceId: `orderId`)
  - Updates `PurchaseOrderItem.quantityReceived`
  - Updates `PurchaseOrder.status`

---

## Related Modules

- **Suppliers** — supplier attribution on orders
- **Inventory** — quantities updated on receive
- **Inventory Batches** — batches created/incremented on receive
- **Stock Movements** — INBOUND movements created on receive
