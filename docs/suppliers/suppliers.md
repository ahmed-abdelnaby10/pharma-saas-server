# Suppliers Module

## Purpose

Manages the list of suppliers (pharmaceutical distributors and vendors) scoped to each tenant. Suppliers are referenced later by purchasing orders and inventory batches. Each supplier belongs to exactly one tenant and is identified by unique bilingual names (English and Arabic).

---

## Dependencies

- **Auth middleware** — JWT must be valid (`authMiddleware`)
- **Tenant middleware** — request must carry a tenant-scoped JWT (`tenantMiddleware`)
- **Prisma `Supplier` model** — tenant-scoped, `@@unique([tenantId, nameEn])` and `@@unique([tenantId, nameAr])`
- **`Tenant` model** — cascade delete relationship

---

## Endpoints

### `GET /tenant/suppliers`

List all suppliers for the authenticated tenant.

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <access_token>` |
| `Accept-Language` | No | `en` or `ar` (default: `en`) |

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `isActive` | `boolean` | No | Filter by active/inactive status |
| `search` | `string` | No | Case-insensitive search across `nameEn`, `nameAr`, `contactName` |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "cuid",
      "tenantId": "cuid",
      "nameEn": "MediCo Pharma",
      "nameAr": "ميديكو فارما",
      "phone": "+966500000000",
      "email": "contact@medico.sa",
      "address": "Riyadh, KSA",
      "taxId": "300000000000003",
      "contactName": "Ali Hassan",
      "isActive": true,
      "createdAt": "2026-04-18T00:00:00.000Z",
      "updatedAt": "2026-04-18T00:00:00.000Z"
    }
  ],
  "requestId": "uuid"
}
```

---

### `POST /tenant/suppliers`

Create a new supplier for the authenticated tenant.

**Headers**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <access_token>` |
| `Content-Type` | Yes | `application/json` |
| `Accept-Language` | No | `en` or `ar` |

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nameEn` | `string` | Yes | Supplier name in English (unique per tenant) |
| `nameAr` | `string` | Yes | Supplier name in Arabic (unique per tenant) |
| `phone` | `string` | No | Contact phone number |
| `email` | `string` | No | Contact email address |
| `address` | `string` | No | Physical address |
| `taxId` | `string` | No | VAT / tax registration number |
| `contactName` | `string` | No | Primary contact person name |

**Response `201`**

```json
{
  "success": true,
  "message": "Supplier created successfully",
  "data": { ...supplier },
  "requestId": "uuid"
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `409 Conflict` | `supplier.name_conflict` — `nameEn` or `nameAr` already used by another supplier in the same tenant |
| `400 Bad Request` | Validation failure (missing required fields, invalid email) |

---

### `GET /tenant/suppliers/:supplierId`

Retrieve a single supplier by ID.

**Path Parameters**

| Param | Description |
|-------|-------------|
| `supplierId` | CUID of the supplier |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "data": { ...supplier },
  "requestId": "uuid"
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `supplier.not_found` |

---

### `PATCH /tenant/suppliers/:supplierId`

Partially update a supplier's details. All fields are optional; omitted fields remain unchanged. Pass `null` to clear optional string fields.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nameEn` | `string` | No | New English name (unique per tenant) |
| `nameAr` | `string` | No | New Arabic name (unique per tenant) |
| `phone` | `string \| null` | No | Phone (null to clear) |
| `email` | `string \| null` | No | Email (null to clear) |
| `address` | `string \| null` | No | Address (null to clear) |
| `taxId` | `string \| null` | No | Tax ID (null to clear) |
| `contactName` | `string \| null` | No | Contact name (null to clear) |
| `isActive` | `boolean` | No | Toggle active status |

**Response `200`**

```json
{
  "success": true,
  "message": "Supplier updated successfully",
  "data": { ...supplier },
  "requestId": "uuid"
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `supplier.not_found` |
| `409 Conflict` | `supplier.name_conflict` — new name collides with another supplier |
| `400 Bad Request` | No fields provided |

---

### `DELETE /tenant/suppliers/:supplierId`

Deactivate a supplier (soft delete — sets `isActive = false`).

**Response `200`**

```json
{
  "success": true,
  "message": "Supplier deactivated successfully",
  "data": { ...supplier },
  "requestId": "uuid"
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `supplier.not_found` |
| `409 Conflict` | `supplier.already_inactive` — supplier is already inactive |

---

## Permissions

All endpoints require a valid tenant JWT. No granular RBAC permission codes are enforced in this slice — enforcement will be added when the permission guard middleware is wired up.

---

## Tenant / Branch Scope

- All operations are scoped to the `tenantId` extracted from the JWT.
- Suppliers are not branch-scoped — they are shared across all branches of a tenant.

---

## Side Effects

- None in this slice. In future slices, supplier records will be referenced by purchasing orders.

---

## Related Modules

- **Purchasing** (future) — purchase orders reference `supplierId`
- **Inventory Batches** (future) — batches may carry supplier metadata
- **Tenant Settings** — VAT percentage applies to supplier invoice calculations
