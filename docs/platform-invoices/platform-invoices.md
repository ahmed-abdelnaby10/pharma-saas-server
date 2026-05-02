# Platform Invoices

## Purpose

Allows platform admins to create and manage billing invoices issued to tenants for their subscription periods. Tracks the full payment lifecycle: `DRAFT → ISSUED → PAID` or `DRAFT/ISSUED → VOID`.

## Dependencies

- `authMiddleware` — validates JWT
- `platformMiddleware` — requires platform admin scope
- `Tenant`, `Subscription` models (foreign keys)
- `PlatformInvoice` Prisma model

## Endpoints

### `GET /platform/invoices`

List all invoices with optional filtering.

**Headers**

| Header | Required | Description |
|---|---|---|
| `Authorization` | ✅ | `Bearer <platformAdminJwt>` |

**Query Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `tenantId` | `string (cuid)` | ❌ | Filter by tenant |
| `status` | `DRAFT \| ISSUED \| PAID \| VOID \| OVERDUE` | ❌ | Filter by status |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "clx...",
      "tenantId": "clx...",
      "subscriptionId": "clx...",
      "invoiceNumber": "INV-2026-ABC123",
      "status": "ISSUED",
      "amount": "299.00",
      "currency": "EGP",
      "periodStart": "2026-04-01T00:00:00.000Z",
      "periodEnd": "2026-04-30T23:59:59.000Z",
      "dueDate": "2026-05-05T00:00:00.000Z",
      "paidAt": null,
      "notes": null,
      "createdAt": "2026-04-22T10:00:00.000Z",
      "updatedAt": "2026-04-22T10:00:00.000Z"
    }
  ],
  "meta": { "count": 1 }
}
```

---

### `POST /platform/invoices`

Create a new DRAFT invoice.

**Body**

```json
{
  "tenantId": "clx...",
  "subscriptionId": "clx...",
  "amount": 299.00,
  "currency": "EGP",
  "periodStart": "2026-04-01T00:00:00.000Z",
  "periodEnd": "2026-04-30T23:59:59.000Z",
  "dueDate": "2026-05-05T00:00:00.000Z",
  "notes": "Monthly subscription - April 2026"
}
```

| Field | Type | Required |
|---|---|---|
| `tenantId` | cuid | ✅ |
| `subscriptionId` | cuid | ❌ |
| `amount` | positive number | ✅ |
| `currency` | 3-char string | ❌ (default: EGP) |
| `periodStart` | ISO datetime | ✅ |
| `periodEnd` | ISO datetime | ✅ |
| `dueDate` | ISO datetime | ✅ |
| `notes` | string (max 1000) | ❌ |

**Response `201`** — invoice with `status: DRAFT` and auto-generated `invoiceNumber`.

---

### `GET /platform/invoices/:invoiceId`

Fetch a single invoice.

**Response `200`** or **`404`** if not found.

---

### `PATCH /platform/invoices/:invoiceId/issue`

Transition invoice from `DRAFT` → `ISSUED`.

**Error `409`** — invoice is not in DRAFT status.

---

### `PATCH /platform/invoices/:invoiceId/mark-paid`

Transition invoice from `ISSUED` or `OVERDUE` → `PAID`. Sets `paidAt` to current time.

**Error `409`** — invoice is not in a payable status.

---

### `PATCH /platform/invoices/:invoiceId/void`

Void any non-PAID, non-already-VOID invoice.

**Error `409`** — invoice is PAID or already VOID.

---

## Permissions

All endpoints require a valid platform admin JWT (`scope: "platform"`, `isPlatformAdmin: true`).

## Side Effects

- Invoice numbers are auto-generated: `INV-{YYYY}-{6-char alphanumeric}`.
- `mark-paid` stamps `paidAt` with the current timestamp.

## Related Modules

- **Subscriptions** — invoices optionally link to a subscription
- **Tenants** — invoices are always linked to a tenant
