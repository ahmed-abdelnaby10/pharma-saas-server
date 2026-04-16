# Foundation Bootstrap

## Purpose

Establish the Phase 0 application bootstrap for the modular monolith backend. This slice provides config loading, env validation, DB and Redis client setup, normalized HTTP responses, base middleware, route registration skeleton, and a health endpoint.

## Dependencies

- Express
- TypeScript
- Prisma Client
- PostgreSQL connection via `DATABASE_URL`
- Redis connection via `REDIS_URL`
- Zod for env validation

## Endpoints

### `GET /health`

Checks that the HTTP app is running and returns the normalized success response shape.

## Headers

- `Accept-Language`: optional, supports `en` and `ar`; unsupported or missing values fall back to the app default language in this slice.
- `x-request-id`: optional; if absent, the server generates one and echoes it back in the response headers.

## Path Params

None.

## Query Params

None.

## Request Body

None.

## Response Shape

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "service": "Pharmacy SaaS",
    "status": "ok",
    "environment": "development"
  }
}
```

Error responses use:

```json
{
  "success": false,
  "message": "Route not found",
  "errorCode": "ROUTE_NOT_FOUND",
  "requestId": "..."
}
```

## Validation Rules

- Required env vars are validated at startup.
- Invalid env configuration stops the process before boot.

## Permissions Required

None.

## Tenant / Branch Scope Rules

- No tenant or branch context is accepted or resolved in this slice.
- `/api/v1/platform` and `/api/v1/tenant` are mounted as empty route skeletons for later slices.

## Side Effects

- Opens Prisma and Redis connections during server startup.
- Adds request IDs to all requests.
- Applies global error normalization.

## Related Modules

- `src/core/config`
- `src/core/i18n`
- `src/core/db`
- `src/core/cache`
- `src/core/logger`
- `src/core/http`
- `src/shared/errors`
- `src/shared/middlewares`
