# Subscriptions Module

## Purpose

Manages the lifecycle of tenant subscriptions from the platform admin perspective. Covers creating new subscriptions, listing subscription history, viewing the current in-effect subscription, changing the subscribed plan, and canceling. Payment gateway integration and invoice generation are out of scope for this slice.

---

## Dependencies

| Dependency | Role |
|---|---|
| `platform/plans` repository | Resolve plan by ID, verify `isActive`, read `trialDays` |
| `platform/tenants` repository | Verify tenant exists; update `isTrialActive` on cancel |
| `Subscription` Prisma model | All subscription state |
| `Tenant` Prisma model | Trial state read + update |
| `auth.middleware` | Extract and validate bearer token |
| `platform.middleware` | Enforce platform-admin scope |
| i18n `subscription.*` | Localized response messages |
| i18n `plan.*`, `tenant.*`, `common.*` | Shared error messages |

---

## Endpoints

All endpoints are mounted under `/api/v1/platform/tenants/:tenantId/subscriptions` and require a platform admin JWT.

---

### POST /api/v1/platform/tenants/:tenantId/subscriptions

Create a new subscription for a tenant. Fails if the tenant already has a non-terminal subscription (`trialing`, `active`, `past_due`).

**Auth**: Platform admin bearer token.

**Path params**

| Param | Description |
|---|---|
| `tenantId` | Tenant CUID |

**Headers**

| Header | Value |
|---|---|
| `Authorization` | `Bearer <platform_access_token>` |
| `Content-Type` | `application/json` |
| `Accept-Language` | `en` or `ar` (optional) |

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `planId` | string | yes | ID of an active plan |

**Status logic**

- If `tenant.isTrialActive = true` and `tenant.trialEndsAt` is in the future → `status = trialing`, carries over `trialEndsAt`
- Otherwise → `status = active`

**Response** `201 Created`

```json
{
  "success": true,
  "message": "Subscription created successfully",
  "data": {
    "id": "cuid",
    "tenantId": "cuid",
    "status": "trialing",
    "startsAt": "2026-04-16T10:00:00.000Z",
    "endsAt": null,
    "trialEndsAt": "2026-04-30T10:00:00.000Z",
    "canceledAt": null,
    "createdAt": "2026-04-16T10:00:00.000Z",
    "updatedAt": "2026-04-16T10:00:00.000Z",
    "plan": {
      "id": "cuid",
      "code": "starter-monthly",
      "name": "Starter Monthly",
      "billingInterval": "monthly",
      "price": "199.00",
      "currency": "EGP",
      "trialDays": 14
    },
    "tenant": {
      "id": "cuid",
      "nameEn": "Al Shifa Pharmacy",
      "nameAr": "صيدلية الشفاء",
      "status": "active",
      "isTrialActive": true,
      "trialEndsAt": "2026-04-30T10:00:00.000Z"
    }
  }
}
```

**Error responses**

| Status | errorCode | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `planId` |
| 404 | `NOT_FOUND` | Tenant or plan does not exist |
| 409 | `CONFLICT` | Plan is inactive |
| 409 | `CONFLICT` | Tenant already has a non-terminal subscription |

---

### GET /api/v1/platform/tenants/:tenantId/subscriptions

List all subscriptions for a tenant (full history), ordered by creation date descending.

**Auth**: Platform admin bearer token.

**Query params**

| Param | Type | Description |
|---|---|---|
| `status` | `trialing` \| `active` \| `past_due` \| `canceled` \| `expired` | Filter by status |

**Response** `200 OK` — array of subscription objects (same shape as create response).

---

### GET /api/v1/platform/tenants/:tenantId/subscriptions/current

Get the current in-effect subscription (`status IN (trialing, active, past_due)`), ordered by `createdAt DESC`. Returns `404` if none.

**Auth**: Platform admin bearer token.

**Response** `200 OK` — single subscription object.

**Error responses**

| Status | errorCode | Condition |
|---|---|---|
| 404 | `NOT_FOUND` | No active subscription found |

---

### POST /api/v1/platform/tenants/:tenantId/subscriptions/current/change-plan

Change the tenant's plan. Runs in a **transaction**:
1. Cancel the current subscription (`status = canceled`, `canceledAt = now`, `endsAt = now`)
2. Create a new subscription on the new plan

**Trial carry-over**: If `tenant.isTrialActive = true` and `tenant.trialEndsAt > now`, the new subscription is created as `trialing` with the same `trialEndsAt`. Otherwise the new subscription is `active`.

**Auth**: Platform admin bearer token.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `planId` | string | yes | ID of the new plan |

**Response** `200 OK` — the newly created subscription object.

**Error responses**

| Status | errorCode | Condition |
|---|---|---|
| 404 | `NOT_FOUND` | Tenant, plan, or current subscription not found |
| 409 | `CONFLICT` | New plan is inactive |
| 409 | `CONFLICT` | Tenant is already on this plan |

---

### POST /api/v1/platform/tenants/:tenantId/subscriptions/current/cancel

Cancel the tenant's current subscription. Runs in a **transaction**:
1. Set `status = canceled`, `canceledAt = now`, `endsAt = now`
2. If the subscription was `trialing`, also sets `tenant.isTrialActive = false`

**Auth**: Platform admin bearer token.

**Response** `200 OK` — the canceled subscription object.

**Error responses**

| Status | errorCode | Condition |
|---|---|---|
| 404 | `NOT_FOUND` | Tenant not found |
| 409 | `SUBSCRIPTION_ERROR` | No active subscription to cancel |

---

## Permissions

All endpoints require a valid platform admin JWT (`scope: "platform"`). The `platform.middleware` enforces this.

---

## Tenant / branch scope

This module lives in the platform domain. Subscriptions are scoped to a `tenantId` (path param), but there is no `branchId` scoping — subscriptions are at the tenant level.

---

## Side effects

- **Create**: Creates a `Subscription` record. Does NOT update `tenant.isTrialActive` or `tenant.trialEndsAt` — these were set at tenant creation and are read here for status determination.
- **Change plan (transaction)**:
  - Cancels the current `Subscription` record.
  - Creates a new `Subscription` record.
  - Does NOT update tenant-level trial fields.
- **Cancel (transaction)**:
  - Cancels the current `Subscription` record.
  - If the subscription was `trialing`, sets `tenant.isTrialActive = false`.

---

## Related modules

| Module | Relationship |
|---|---|
| `platform/plans` | Plan must exist and be active for create/change-plan |
| `platform/tenants` | Tenant must exist; `isTrialActive` + `trialEndsAt` read for status; updated on cancel |
| `platform/subscriptions` (future) | Usage/limits and feature-overrides will layer on top of the current subscription |
| `tenant/auth` (Phase 2) | Tenant access control will check subscription status |
| `platform/invoices` (Phase 7) | Invoice generation will hook into plan changes and renewals |
