# Notifications Module

## Purpose

Provides the in-app notification inbox for tenant users. Notifications are created internally by other modules (alerts, OCR worker, shifts) and read/consumed by the frontend via this module's API.

The write path is **internal only** — no external endpoint exists for creating notifications directly. The read/mark-read path is user-facing.

---

## Dependencies

| Dependency | Reason |
|---|---|
| `TenantUser` | Notifications are scoped per-user (`userId`) |
| `Tenant` | `tenantId` scoping + cascade delete |
| `Alerts module` | `POST /alerts/notify` calls `notificationsRepository.create()` |
| Auth + Tenant middleware | All routes require tenant JWT |

---

## Notification Types (`NotificationType` enum)

| Value | Produced by |
|---|---|
| `LOW_STOCK` | `POST /tenant/alerts/notify` |
| `EXPIRY_ALERT` | `POST /tenant/alerts/notify` |
| `OCR_COMPLETED` | OCR worker (future) |
| `OCR_FAILED` | OCR worker (future) |
| `SHIFT_OPENED` | Shifts service (future hook) |
| `SHIFT_CLOSED` | Shifts service (future hook) |
| `PURCHASE_ORDER_RECEIVED` | Purchasing service (future hook) |
| `GENERAL` | Default / manual |

---

## Endpoints

### `GET /tenant/notifications`

**Auth:** Tenant JWT  
**Purpose:** List notifications for the authenticated user, newest first.

**Query params:**

| Param | Required | Description |
|---|---|---|
| `isRead` | No | `true` / `false` — filter by read status. Omit for all. |
| `limit` | No | Page size 1–100 (default 20) |
| `cursor` | No | ISO timestamp of the last item's `createdAt` — use for next-page pagination |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clnotifid",
      "type": "LOW_STOCK",
      "title": "Low stock: Paracetamol 500mg",
      "body": "Quantity on hand (5) is at or below reorder level (10).",
      "metadata": {
        "refId": "clinventoryid",
        "inventoryItemId": "clinventoryid",
        "catalogNameEn": "Paracetamol 500mg",
        "quantityOnHand": "5",
        "reorderLevel": "10"
      },
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-04-27T08:00:00.000Z"
    }
  ]
}
```

---

### `GET /tenant/notifications/unread-count`

**Auth:** Tenant JWT  
**Purpose:** Cheap badge count — how many unread notifications does the user have.

**Response (200):**
```json
{ "success": true, "data": { "count": 4 } }
```

---

### `PATCH /tenant/notifications/:notificationId/read`

**Auth:** Tenant JWT  
**Purpose:** Mark a single notification as read. Idempotent.

**Path param:** `notificationId` — CUID  
**Side effects:** Sets `isRead: true`, `readAt: now`.

---

### `POST /tenant/notifications/read-all`

**Auth:** Tenant JWT  
**Purpose:** Mark all unread notifications for the authenticated user as read.

**Response (200):**
```json
{ "success": true, "data": { "count": 4 } }
```

**Side effects:** Bulk updates all unread notifications for `(tenantId, userId)`.

---

## Notification Metadata

Notification `metadata` is a free-form JSON field. Alert notifications use the following schema so the frontend can render rich cards:

**LOW_STOCK:**
```json
{
  "refId": "<inventoryItemId>",
  "inventoryItemId": "...",
  "branchId": "...",
  "catalogItemId": "...",
  "catalogNameEn": "Paracetamol 500mg",
  "catalogNameAr": "باراسيتامول 500 مجم",
  "quantityOnHand": "5",
  "reorderLevel": "10"
}
```

**EXPIRY_ALERT:**
```json
{
  "refId": "<batchId>",
  "batchId": "...",
  "inventoryItemId": "...",
  "branchId": "...",
  "catalogItemId": "...",
  "catalogNameEn": "Amoxicillin 250mg",
  "catalogNameAr": "أموكسيسيلين 250 مجم",
  "batchNumber": "BATCH-001",
  "expiryDate": "2026-05-10T00:00:00.000Z",
  "daysUntilExpiry": 13,
  "quantityOnHand": "24"
}
```

The `refId` field is used internally for **dedup** — `POST /alerts/notify` checks if a notification with this `refId` was already created in the last 48 hours before creating a new one.

---

## Tenant / User Scope

All notifications are scoped by both `tenantId` (from JWT) and `userId` (from JWT). Users never see each other's notifications. The DB index `(tenantId, userId, isRead)` covers the most common query pattern.

---

## Pagination Pattern

```
GET /tenant/notifications?limit=20
→ returns 20 items, remember createdAt of the last item

GET /tenant/notifications?limit=20&cursor=2026-04-27T06:00:00.000Z
→ returns next 20 items created before that timestamp
```

---

## Related Modules

- `docs/alerts/alerts.md` — primary producer of `LOW_STOCK` and `EXPIRY_ALERT` notifications
- Future: OCR module, Shifts module, Purchase Orders module
