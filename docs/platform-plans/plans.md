# Platform Plans

## Purpose

Manage SaaS plans and their feature definitions from the platform side before subscription billing integration is introduced.

## Dependencies

- `Plan` and `PlanFeature` Prisma models
- `platform/auth` access token
- `src/shared/middlewares/auth.middleware.ts`
- `src/shared/middlewares/platform.middleware.ts`

## Endpoints

### `POST /api/v1/platform/plans`

Creates a plan with optional feature definitions.

### `GET /api/v1/plans`

Lists plans with optional filtering by activity, billing interval, or text search.

### `GET /api/v1/platform/plans/:planId`

Returns a single plan with features.

### `PATCH /api/v1/platform/plans/:planId`

Updates plan fields and optionally replaces the full feature set.

## Headers

### Public list endpoint (`GET /api/v1/plans`)

- `Accept-Language` optional

### Protected platform endpoints (`POST`, `GET /:planId`, `PATCH`)

- `Authorization: Bearer <platform-access-token>` required
- `Accept-Language` optional
- `Content-Type: application/json` for create/update

## Path Params

- `planId`: required plan identifier for get and update

## Query Params

- `search`: optional text match against plan code or name
- `isActive`: optional `true` or `false`
- `billingInterval`: optional `monthly` or `yearly`

## Request Body

Create example:

```json
{
  "code": "starter_monthly",
  "name": "Starter Monthly",
  "description": "Starter plan for small pharmacies",
  "billingInterval": "monthly",
  "price": 299,
  "currency": "EGP",
  "trialDays": 14,
  "isActive": true,
  "features": [
    {
      "featureKey": "catalog.medicines",
      "enabled": true
    },
    {
      "featureKey": "branches.max",
      "enabled": true,
      "limitValue": 1
    }
  ]
}
```

Update example:

```json
{
  "name": "Starter Monthly Plus",
  "price": 349,
  "features": [
    {
      "featureKey": "catalog.medicines",
      "enabled": true
    },
    {
      "featureKey": "branches.max",
      "enabled": true,
      "limitValue": 2
    }
  ]
}
```

## Response Shape

```json
{
  "success": true,
  "message": "Plan created successfully",
  "data": {
    "id": "clx...",
    "code": "starter_monthly",
    "name": "Starter Monthly",
    "description": "Starter plan for small pharmacies",
    "billingInterval": "monthly",
    "price": "299",
    "currency": "EGP",
    "trialDays": 14,
    "isActive": true,
    "features": [
      {
        "id": "clx...",
        "featureKey": "branches.max",
        "enabled": true,
        "limitValue": 1
      }
    ]
  },
  "requestId": "..."
}
```

## Validation Rules

- `code`: 2-50 chars, normalized to lowercase
- `name`: 2-120 chars
- `billingInterval`: `monthly` or `yearly`
- `price`: non-negative number
- `currency`: 3-letter code, normalized to uppercase
- `trialDays`: integer from `0` to `365`
- update requests must contain at least one field
- feature keys are normalized to lowercase
- if `features` is sent in update, it replaces the current feature set

## Permissions Required

- `GET /api/v1/plans` is public (no token required)
- Platform access token required for create, get by id, and update

## Tenant / Branch Scope Rules

- Platform-only module
- Tenant tokens are rejected by the platform scope middleware
- No tenant or branch parameters are accepted

## Side Effects

- Create inserts a `Plan` and zero or more `PlanFeature` rows
- Update can replace the full `PlanFeature` set for a plan

## Related Modules

- Future `platform/subscriptions`
- Future `platform/tenants`
- Future usage/limits and feature override modules
