# Auth Primitives

## Purpose

Provide the shared authentication foundation for future platform and tenant auth flows. This slice covers password hashing, JWT access token handling, request auth context typing, bearer token middleware, tenant guard skeleton, and permission guard skeleton.

## Dependencies

- `bcrypt`
- `jsonwebtoken`
- `src/core/config/env.ts`
- `src/shared/errors`
- `src/core/i18n/locales/en/auth.json`
- `src/core/i18n/locales/ar/auth.json`

## Endpoints

No auth routes are implemented in this slice.

## Headers

- `Authorization: Bearer <access-token>` for future protected routes.
- `Accept-Language` continues to localize auth-related error messages.

## Path Params

None.

## Query Params

None.

## Request Body

None.

## Response Shape

This slice does not add endpoints. Shared auth middleware now emits normalized localized errors such as:

```json
{
  "success": false,
  "message": "Authorization token is required",
  "errorCode": "UNAUTHORIZED",
  "requestId": "..."
}
```

## Validation Rules

- Password hashing rejects blank password input.
- Access tokens must decode to a valid `tokenType: "access"` payload.
- Platform auth context requires `scope: "platform"` and `isPlatformAdmin: true`.
- Tenant auth context requires `scope: "tenant"` and a non-empty `tenantId`.

## Permissions Required

None in this slice. Permission enforcement is shared middleware only.

## Tenant / Branch Scope Rules

- Tenant routes will later enforce `scope: "tenant"` plus `tenantId` through `tenantMiddleware`.
- Branch context remains optional in the auth payload for now and will be enforced where branch-scoped operations are introduced.

## Side Effects

- `req.auth` is populated with a validated auth context after token verification.
- `req.accessToken` stores the raw bearer token for downstream use if needed.
- Permission checks fail consistently through shared middleware.

## Related Modules

- `src/core/security/password.ts`
- `src/core/security/jwt.ts`
- `src/shared/types/auth.types.ts`
- `src/shared/middlewares/auth.middleware.ts`
- `src/shared/middlewares/tenant.middleware.ts`
- `src/shared/middlewares/permission.middleware.ts`
