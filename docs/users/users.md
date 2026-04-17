# Users Module

## Purpose

Manages tenant user accounts. Users are scoped to a tenant and may optionally be assigned to a branch. Passwords are hashed with bcrypt on creation and update. `passwordHash` is never exposed in any API response.

## Dependencies

- **Tenant auth** — all routes require a valid tenant JWT (`Authorization: Bearer <token>`)
- **Branches** — optional `branchId` is validated: must exist and be active within the same tenant
- `prisma.tenantUser` model

## Tenant / Branch Scope

- `tenantId` always comes from the JWT — never from the request body
- `branchId` is optional; validated to belong to the same tenant and be active

---

## Endpoints

### `GET /tenant/users`

List all users for the authenticated tenant.

**Auth:** Tenant JWT required

**Query params:**

| Param    | Type    | Required | Description                       |
|----------|---------|----------|-----------------------------------|
| isActive | boolean | No       | Filter by active status           |
| branchId | string  | No       | Filter by branch assignment       |

**Response `200`:**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "cuid",
      "tenantId": "cuid",
      "branchId": "cuid or null",
      "email": "user@example.com",
      "fullName": "Ahmed Ali",
      "isActive": true,
      "preferredLanguage": "ar",
      "createdAt": "2026-04-16T00:00:00.000Z",
      "updatedAt": "2026-04-16T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /tenant/users`

Create a new tenant user.

**Auth:** Tenant JWT required

**Body:**

| Field             | Type   | Required | Rules                              |
|-------------------|--------|----------|------------------------------------|
| email             | string | Yes      | Valid email, unique per tenant     |
| password          | string | Yes      | 8–128 chars                        |
| fullName          | string | Yes      | 2–120 chars                        |
| branchId          | string | No       | Must be an active branch in this tenant |
| preferredLanguage | string | No       | `"en"` or `"ar"`                  |

**Side effects:**
- Password is hashed with bcrypt before storage
- `passwordHash` is never returned in the response

**Response `201`:** User object (no `passwordHash`)

**Errors:**
- `409 user.email_conflict` — email already in use within the tenant
- `400` — branchId invalid, not found, or inactive

---

### `GET /tenant/users/:userId`

Fetch a single user by ID.

**Auth:** Tenant JWT required

**Response `200`:** User object

**Errors:**
- `404 user.not_found`

---

### `PATCH /tenant/users/:userId`

Update user fields. At least one field required.

**Auth:** Tenant JWT required

**Body (all optional, at least one required):**

| Field             | Type         | Rules                              |
|-------------------|--------------|------------------------------------|
| fullName          | string       | 2–120 chars                        |
| password          | string       | 8–128 chars, re-hashed on update   |
| branchId          | string\|null | Set to `null` to unassign          |
| preferredLanguage | string\|null | `"en"`, `"ar"`, or `null`         |

**Response `200`:** Updated user object

**Errors:**
- `404 user.not_found`
- `400` — branchId invalid

---

### `DELETE /tenant/users/:userId`

Soft-deactivate a user (`isActive: false`). The user can no longer log in.

**Auth:** Tenant JWT required

**Response `200`:** Deactivated user object

**Errors:**
- `404 user.not_found`
- `409 user.already_inactive`

---

## Permissions

Currently open to any authenticated tenant user. Role/permission enforcement will be added in the RBAC slice.

## Related Modules

- **Branches** — user may be assigned to a branch
- **Tenant auth** — login flow uses the same `TenantUser` records
- **Roles / RBAC** — future slice will attach roles to users
