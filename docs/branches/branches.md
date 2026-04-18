# Branches Module

## Purpose

Manages physical branch locations for a tenant. Each tenant can have multiple branches. Branches are used to scope operational data (inventory, shifts, POS). One branch can be marked as the default.

## Dependencies

- **Tenant auth** — all routes require a valid tenant JWT (`Authorization: Bearer <token>`)
- **Subscriptions / Plans** — branch creation enforces the `max_branches` plan feature limit
- `prisma.branch` model

## Tenant / Branch Scope

- All operations are scoped to `tenantId` extracted from the JWT — never from request body
- Branch records are never shared across tenants

---

## Endpoints

### `GET /tenant/branches`

List all branches for the authenticated tenant.

**Auth:** Tenant JWT required

**Query params:**

| Param    | Type    | Required | Description                       |
|----------|---------|----------|-----------------------------------|
| isActive | boolean | No       | Filter by active status (`true`/`false`) |

**Response `200`:**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "cuid",
      "tenantId": "cuid",
      "nameEn": "Main Branch",
      "nameAr": "الفرع الرئيسي",
      "address": "123 Main St",
      "phone": "+966512345678",
      "isActive": true,
      "isDefault": true,
      "createdAt": "2026-04-16T00:00:00.000Z",
      "updatedAt": "2026-04-16T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /tenant/branches`

Create a new branch.

**Auth:** Tenant JWT required

**Headers:**

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Authorization | Bearer `<token>` |

**Body:**

| Field    | Type    | Required | Rules                     |
|----------|---------|----------|---------------------------|
| nameEn   | string  | Yes      | 2–120 chars, unique per tenant |
| nameAr   | string  | Yes      | 2–120 chars, unique per tenant |
| address  | string  | No       | 2–500 chars               |
| phone    | string  | No       | 5–30 chars                |
| isDefault | boolean | No     | Defaults to `false`. If `true`, existing default is unset in a transaction |

**Side effects:**
- Enforces `max_branches` plan feature limit (count of active branches)
- If `isDefault: true`, clears `isDefault` on any existing default branch atomically

**Response `201`:** Branch object

**Errors:**
- `403 branch.limit_exceeded` — plan branch limit reached
- `409 branch.name_conflict` — nameEn or nameAr already in use

---

### `GET /tenant/branches/:branchId`

Fetch a single branch by ID.

**Auth:** Tenant JWT required

**Path params:**

| Param    | Type   | Description  |
|----------|--------|--------------|
| branchId | string | Branch CUID  |

**Response `200`:** Branch object

**Errors:**
- `404 branch.not_found`

---

### `PATCH /tenant/branches/:branchId`

Update branch fields. At least one field required.

**Auth:** Tenant JWT required

**Body (all optional, at least one required):**

| Field    | Type    | Rules                              |
|----------|---------|------------------------------------|
| nameEn   | string  | 2–120 chars, unique per tenant     |
| nameAr   | string  | 2–120 chars, unique per tenant     |
| address  | string  | 2–500 chars                        |
| phone    | string  | 5–30 chars                         |
| isDefault | boolean | If `true`, clears existing default atomically |

**Side effects:**
- If `isDefault: true`, existing default branch is unset in a transaction

**Response `200`:** Updated branch object

**Errors:**
- `404 branch.not_found`
- `409 branch.name_conflict`

---

### `DELETE /tenant/branches/:branchId`

Deactivate a branch (soft delete). Sets `isActive: false` and `isDefault: false`.

**Auth:** Tenant JWT required

**Response `200`:** Deactivated branch object

**Errors:**
- `404 branch.not_found`
- `409 branch.already_inactive`

---

## Permissions

Currently open to any authenticated tenant user. Role/permission enforcement will be added in the RBAC slice.

## Related Modules

- **Users** — tenant users will be assigned to a branch (`branchId`)
- **Inventory** — stock is scoped per branch
- **Shifts / POS** — operational data scoped per branch
- **Plans** — `max_branches` feature key controls creation limit
