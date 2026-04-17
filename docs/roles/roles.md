# Roles & Permissions Module (RBAC)

## Purpose

Provides role-based access control for tenant users. Roles are tenant-defined. Permissions are platform-seeded and read-only. After this slice the JWT `roleCodes` and `permissions` arrays are populated from the database on every login.

## Dependencies

- **Tenant auth** — all routes require a tenant JWT
- **Users** — user-role assignment validates `userId` belongs to tenant
- `prisma.role`, `prisma.permission`, `prisma.rolePermission`, `prisma.userRole`
- Seeder: `npx ts-node prisma/seed-permissions.ts`

## Tenant Scope

- Roles are scoped to `tenantId` (unique `[tenantId, code]`)
- Permissions are global/platform-seeded — no tenantId
- User-role assignment is implicitly scoped: roles validated against tenant before assignment

## JWT Integration

On every `POST /tenant/auth/login`, the service calls `rolesRepository.resolveUserRolesAndPermissions(userId)` and embeds `roleCodes` and `permissions` into the signed access token.

---

## Endpoints

### `GET /tenant/permissions`

List all platform-defined permissions, ordered by module then code.

**Auth:** Tenant JWT required

**Response `200`:**
```json
{
  "data": [
    { "id": "...", "code": "inventory:read", "nameEn": "View Inventory", "nameAr": "...", "module": "inventory" }
  ]
}
```

---

### `GET /tenant/roles`

List all roles for the authenticated tenant (with their permissions).

**Auth:** Tenant JWT required

---

### `POST /tenant/roles`

Create a new role.

**Body:**

| Field  | Type   | Required | Rules                                       |
|--------|--------|----------|---------------------------------------------|
| code   | string | Yes      | 2–64 chars, `[a-z0-9_]` only, unique per tenant |
| nameEn | string | Yes      | 2–120 chars                                 |
| nameAr | string | Yes      | 2–120 chars                                 |

**Response `201`:** Role object with empty `permissions[]`

**Errors:** `409 role.code_conflict`

---

### `GET /tenant/roles/:roleId`

Get a single role with its permissions.

**Errors:** `404 role.not_found`

---

### `PATCH /tenant/roles/:roleId`

Update role code or names. At least one field required.

**Errors:** `404 role.not_found`, `409 role.code_conflict`

---

### `DELETE /tenant/roles/:roleId`

Soft-deactivate a role (`isActive: false`). Deactivated roles are excluded from JWT resolution on next login.

**Errors:** `404 role.not_found`, `409 role.already_inactive`

---

### `POST /tenant/roles/:roleId/permissions`

Assign permissions to a role. Idempotent — duplicates are skipped.

**Body:**
```json
{ "permissionIds": ["cuid1", "cuid2"] }
```

**Response `200`:** Updated role with full permissions list

**Errors:** `404 role.not_found`, `400` if any permissionId is invalid

---

### `DELETE /tenant/roles/:roleId/permissions`

Remove permissions from a role.

**Body:**
```json
{ "permissionIds": ["cuid1"] }
```

**Response `200`:** Updated role

---

### `GET /tenant/users/:userId/roles`

List all roles assigned to a user.

**Errors:** `404 user.not_found`

---

### `POST /tenant/users/:userId/roles`

Assign roles to a user. Idempotent — duplicates are skipped. All roleIds must belong to the same tenant.

**Body:**
```json
{ "roleIds": ["cuid1", "cuid2"] }
```

**Response `200`:** Array of assigned roles

**Errors:** `404 user.not_found`, `400` if any roleId is invalid

---

### `DELETE /tenant/users/:userId/roles`

Remove roles from a user.

**Body:**
```json
{ "roleIds": ["cuid1"] }
```

**Response `200`:** Remaining roles for the user

---

## Permission Seeder

```bash
npx ts-node prisma/seed-permissions.ts
```

Upserts all platform-defined permission codes. Safe to re-run. Seeded modules: `branches`, `users`, `roles`, `inventory`, `purchasing`, `sales`, `shifts`, `reports`, `settings`, `suppliers`.

## Related Modules

- **Tenant auth** — JWT payload `roleCodes` + `permissions` populated here
- **Users** — user-role assignment
- **Future** — middleware enforcement of specific permission codes per route
