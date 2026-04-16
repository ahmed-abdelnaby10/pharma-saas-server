# Platform Admin Login

## Purpose

Authenticate platform admins by email and password and return a platform access token for future SaaS owner APIs.

## Dependencies

- `PlatformAdmin` Prisma model
- `src/core/security/password.ts`
- `src/core/security/jwt.ts`
- `src/modules/platform/auth/repository/platform-auth.repository.ts`

## Endpoints

### `POST /api/v1/platform/auth/login`

Authenticates a platform admin and returns an access token.

## Headers

- `Accept-Language`: optional, supports `en` and `ar`
- `Content-Type: application/json`

## Path Params

None.

## Query Params

None.

## Request Body

```json
{
  "email": "admin@example.com",
  "password": "Secret123"
}
```

## Response Shape

```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "accessToken": "jwt-token",
    "admin": {
      "id": "clx...",
      "email": "admin@example.com",
      "fullName": "Platform Admin"
    }
  },
  "requestId": "..."
}
```

## Validation Rules

- `email` must be a valid email address
- `password` must be a non-empty string
- inactive or missing admins return the same invalid-credentials response as wrong passwords

## Permissions Required

None.

## Tenant / Branch Scope Rules

- This is platform-only auth.
- Returned access tokens carry `scope: "platform"` and `isPlatformAdmin: true`.
- No tenant context is accepted or returned here.

## Side Effects

- None beyond token issuance.

## Related Modules

- Future `platform/plans`
- Future `platform/tenants`
- Future `platform/subscriptions`
- Future `platform/audit-logs`
