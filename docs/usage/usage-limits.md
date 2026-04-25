# Usage & Limits

## Overview

Centralizes plan-limit enforcement so every tenant module can call a single service rather than duplicating subscription lookups. All limits are driven by `PlanFeature` rows attached to the tenant's active subscription plan.

---

## Feature Keys

Defined in `src/shared/constants/feature-keys.ts`:

| Key | Type | Description |
|---|---|---|
| `max_branches` | Count limit | Maximum active branches |
| `max_users` | Count limit | Maximum active users |
| `ocr_enabled` | Flag | Access to OCR document processing |
| `sales_returns_enabled` | Flag | Access to sales return flow |
| `advanced_analytics_enabled` | Flag | Access to analytics module |

**Count-limited** keys have a meaningful `limitValue` (Int) on the `PlanFeature` row and a `currentValue` in the usage response. **Feature flags** use only `enabled` (boolean).

---

## Core Service

`src/core/usage/usage-limit.service.ts` — `usageLimitService` singleton.

### `assertCountUnderLimit(tenantId, featureKey, currentCount)`

Called before creating a resource. If the plan has a limit for that key and `currentCount >= limitValue`, throws `PaymentRequiredError` (402).

If the feature key is absent from the plan, the limit is **not enforced** (open/unlimited).

### `assertFeatureEnabled(tenantId, featureKey)`

Called before entering a feature-gated endpoint. Throws `PaymentRequiredError` (402) if the feature is absent or `enabled: false`.

### `getEntitlements(tenantId)`

Returns the raw `PlanFeature[]` for the tenant's active plan. Used to build entitlement summaries.

Both methods throw `ForbiddenError` (403) when there is no active subscription at all.

---

## Enforced Points

| Resource | Feature key | Where |
|---|---|---|
| Branch create | `max_branches` | `BranchesService.createBranch` |
| User create | `max_users` | `UsersService.createUser` |

---

## Endpoints

### `GET /tenant/subscription`

Tenant user's own subscription view.

**Auth:** `Authorization: Bearer <tenantToken>`

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptionId": "clx_abc",
    "planCode": "basic",
    "planName": "Basic",
    "status": "active",
    "startsAt": "2026-01-01T00:00:00.000Z",
    "endsAt": null,
    "trialEndsAt": null,
    "entitlements": [
      { "featureKey": "max_branches", "enabled": true, "limitValue": 3 },
      { "featureKey": "max_users", "enabled": true, "limitValue": 10 },
      { "featureKey": "ocr_enabled", "enabled": false, "limitValue": null }
    ]
  }
}
```

### `GET /platform/tenants/:tenantId/usage`

Platform admin view of a tenant's usage vs plan limits.

**Auth:** `Authorization: Bearer <platformToken>`

**Response:**
```json
{
  "success": true,
  "data": {
    "tenantId": "clx_tenant",
    "planCode": "basic",
    "planName": "Basic",
    "subscriptionStatus": "active",
    "features": [
      { "featureKey": "max_branches", "enabled": true, "limitValue": 3, "currentValue": 1 },
      { "featureKey": "max_users", "enabled": true, "limitValue": 10, "currentValue": 4 },
      { "featureKey": "ocr_enabled", "enabled": false, "limitValue": null }
    ]
  }
}
```

`currentValue` is present only for count-limited feature keys.

---

## Error Responses

### 402 Payment Required — `PAYMENT_REQUIRED`

Returned when a limit is hit or a feature flag is disabled:

```json
{
  "success": false,
  "errorCode": "PAYMENT_REQUIRED",
  "message": "Limit reached for 'max_branches' on your plan",
  "details": {
    "featureKey": "max_branches",
    "limit": 3,
    "current": 3
  }
}
```

### 403 Forbidden — no active subscription

```json
{
  "success": false,
  "errorCode": "FORBIDDEN",
  "message": "No active subscription found"
}
```

---

## Adding Enforcement to New Resources

```typescript
// 1. Import
import { usageLimitService } from "../../../../core/usage/usage-limit.service";
import { FeatureKey } from "../../../../shared/constants/feature-keys";

// 2. Count-limited resource (e.g. inventory items)
const count = await repository.countActive(tenantId);
await usageLimitService.assertCountUnderLimit(tenantId, FeatureKey.MAX_USERS, count);

// 3. Feature flag gate
await usageLimitService.assertFeatureEnabled(tenantId, FeatureKey.OCR_ENABLED);
```

To expose a new countable resource in the platform usage response, add a `case` to `resolveCurrentCount` in `usage.service.ts` and add the key to `COUNT_LIMITED_KEYS` in `feature-keys.ts`.
