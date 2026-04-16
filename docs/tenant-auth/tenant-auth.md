# Tenant Auth Module

## Purpose

Authenticates `TenantUser` records against their tenant. Issues a JWT with full tenant context (`scope: "tenant"`, `tenantId`, `userId`, `roleCodes`, `permissions`, `preferredLanguage`) that all subsequent tenant-scoped API calls depend on.

This module is fully separate from the platform auth module — there is no shared login endpoint, no JWT overlap, and no cross-scope token acceptance.

---

## Dependencies

| Dependency | Role |
|---|---|
| `TenantUser` Prisma model | User lookup by `(tenantId, email)` — email is unique per tenant, not globally |
| `Tenant` Prisma model | Status check (`active` required) + language fallback |
| `comparePassword` (`core/security/password`) | bcrypt password verification |
| `signAccessToken` (`core/security/jwt`) | JWT issuance using `JWT_ACCESS_SECRET` |
| `authMiddleware` | Bearer token extraction and verification for `/me` |
| `tenantMiddleware` | Enforces `scope: "tenant"` on `/me` |
| i18n `auth.*` | `auth.login_success`, `auth.invalid_credentials` |
| i18n `user.*` | `user.tenant_suspended` |

---

## Endpoints

### POST /api/v1/tenant/auth/login

Authenticate a tenant user. Returns an access token and user profile.

**Auth**: None — public endpoint.

**Headers**

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Accept-Language` | `en` or `ar` (optional, affects error message language only) |

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `tenantId` | string | yes | The tenant's CUID |
| `email` | string (email) | yes | User's email address (case-insensitive) |
| `password` | string | yes | User's password |

> `tenantId` is required because email is unique per-tenant, not globally. This is the login-only exception to the "never trust tenantId from body" rule — at login there is no JWT yet.

**Language resolution** (applied to the issued JWT)

1. `TenantUser.preferredLanguage` (if set)
2. `Tenant.preferredLanguage` (fallback)

The resolved language is stored in the JWT and can be used by subsequent requests to serve localized responses without an `Accept-Language` header.

**Response** `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "<jwt>",
    "user": {
      "id": "cuid",
      "email": "user@example.com",
      "fullName": "Ahmed Mohamed",
      "tenantId": "cuid",
      "preferredLanguage": "ar"
    }
  },
  "requestId": "uuid"
}
```

**Error responses**

| Status | errorCode | Condition |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Missing or invalid fields |
| 401 | `UNAUTHORIZED` | User not found, user inactive, or wrong password |
| 403 | `FORBIDDEN` | Tenant is `suspended` or `inactive` |

> Inactive users and unknown users both return `401 UNAUTHORIZED` with the generic `auth.invalid_credentials` message to prevent user enumeration.

---

### GET /api/v1/tenant/auth/me

Returns the auth context decoded from the tenant JWT. No database query is made — all data comes from the verified token.

**Auth**: Tenant bearer token required (`scope: "tenant"`).

**Headers**

| Header | Value |
|---|---|
| `Authorization` | `Bearer <tenant_access_token>` |

**Response** `200 OK`

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "userId": "cuid",
    "tenantId": "cuid",
    "preferredLanguage": "ar",
    "roleCodes": [],
    "permissions": []
  }
}
```

> `roleCodes` and `permissions` are empty arrays until Phase 2 RBAC is implemented.

**Error responses**

| Status | errorCode | Condition |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Token is a platform admin token, not a tenant token |

---

## Permissions

- `POST /login` — public, no auth required
- `GET /me` — requires a valid tenant JWT (`authMiddleware` + `tenantMiddleware`)

Platform admin tokens are rejected by `tenantMiddleware` with `403 FORBIDDEN`.

---

## Tenant / branch scope

All authenticated tenant routes extract `tenantId` from the JWT — never from the request body or query params. The login endpoint is the only exception: it accepts `tenantId` in the body because no JWT exists yet.

---

## Side effects

None. Login and `/me` are read-only operations. No session records, no audit logs in this slice.

---

## Related modules

| Module | Relationship |
|---|---|
| `platform/tenants` | Tenant must be `active` to allow login |
| `tenant/users` (Phase 2) | User management — create/update `TenantUser` records |
| `tenant/roles` (Phase 2) | `roleCodes` in the JWT will be populated here |
| `tenant/permissions` (Phase 2) | `permissions` in the JWT will be populated here |
| `shared/middlewares/tenant.middleware` | Used on all protected tenant routes |
