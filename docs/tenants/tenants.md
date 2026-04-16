# Tenants Module

## Purpose

Manages pharmacy SaaS tenants from the platform admin perspective. A tenant represents a pharmacy business that subscribes to the platform. The creation flow is transactional: it atomically creates the `Tenant`, its default `TenantSettings`, and a `Subscription` in `trialing` status derived from the selected plan's `trialDays`.

---

## Dependencies

| Dependency | Reason |
|---|---|
| `platform/plans` repository | Resolve plan by ID, read `trialDays` and `isActive` |
| `Tenant` Prisma model | Core tenant record |
| `TenantSettings` Prisma model | Auto-created on tenant creation |
| `Subscription` Prisma model | Trial subscription created transactionally |
| `auth.middleware` | Extracts and validates bearer token |
| `platform.middleware` | Enforces platform-admin scope |
| i18n `tenant.*` keys | Localized response messages |
| i18n `plan.*` keys | Localized plan error messages |

---

## Endpoints

### POST /api/v1/platform/tenants

Create a new tenant with default settings and a trial subscription.

**Auth**: Platform admin bearer token required.

**Headers**

| Header | Value |
|---|---|
| `Authorization` | `Bearer <platform_access_token>` |
| `Content-Type` | `application/json` |
| `Accept-Language` | `en` or `ar` (optional, defaults to `en`) |

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `nameEn` | string (2–120) | yes | Tenant name in English |
| `nameAr` | string (2–120) | yes | Tenant name in Arabic |
| `preferredLanguage` | `"en"` \| `"ar"` | yes | Default language for the tenant |
| `planId` | string | yes | ID of an active plan to subscribe to |

**Response** `201 Created`

```json
{
  "success": true,
  "message": "Tenant created successfully",
  "data": {
    "id": "cuid",
    "nameEn": "Al Shifa Pharmacy",
    "nameAr": "صيدلية الشفاء",
    "preferredLanguage": "ar",
    "status": "active",
    "isTrialActive": true,
    "trialEndsAt": "2026-04-30T00:00:00.000Z",
    "createdAt": "2026-04-16T10:00:00.000Z",
    "updatedAt": "2026-04-16T10:00:00.000Z",
    "settings": {
      "organizationName": null,
      "taxId": null,
      "phone": null,
      "email": null,
      "vatPercentage": "0",
      "defaultLanguage": "ar",
      "lowStockAlerts": true,
      "expiryAlerts": true,
      "purchaseOrderUpdates": true
    },
    "subscription": {
      "id": "cuid",
      "status": "trialing",
      "startsAt": "2026-04-16T10:00:00.000Z",
      "endsAt": null,
      "trialEndsAt": "2026-04-30T00:00:00.000Z",
      "plan": {
        "id": "cuid",
        "code": "starter-monthly",
        "name": "Starter Monthly",
        "billingInterval": "monthly",
        "price": "199.00",
        "currency": "EGP",
        "trialDays": 14
      }
    }
  },
  "requestId": "uuid"
}
```

**Error responses**

| Status | errorCode | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid body fields |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Token is not a platform admin token |
| 404 | `NOT_FOUND` | `planId` does not exist |
| 409 | `CONFLICT` | Plan exists but `isActive = false` |

---

### GET /api/v1/platform/tenants

List all tenants with optional filters.

**Auth**: Platform admin bearer token required.

**Headers**

| Header | Value |
|---|---|
| `Authorization` | `Bearer <platform_access_token>` |

**Query params**

| Param | Type | Description |
|---|---|---|
| `search` | string | Case-insensitive search against `nameEn` or `nameAr` |
| `status` | `"active"` \| `"suspended"` \| `"inactive"` | Filter by tenant status |

**Response** `200 OK`

```json
{
  "success": true,
  "message": "OK",
  "data": [ /* array of tenant objects (same shape as create response) */ ]
}
```

---

### GET /api/v1/platform/tenants/:tenantId

Get a single tenant by ID.

**Auth**: Platform admin bearer token required.

**Path params**

| Param | Description |
|---|---|
| `tenantId` | Tenant CUID |

**Response** `200 OK` — single tenant object (same shape as create response)

**Error responses**

| Status | errorCode | Condition |
|---|---|---|
| 404 | `NOT_FOUND` | Tenant does not exist |

---

### PATCH /api/v1/platform/tenants/:tenantId

Update tenant fields. At least one field must be provided.

**Auth**: Platform admin bearer token required.

**Path params**

| Param | Description |
|---|---|
| `tenantId` | Tenant CUID |

**Request body** (all fields optional, at least one required)

| Field | Type | Description |
|---|---|---|
| `nameEn` | string (2–120) | Tenant name in English |
| `nameAr` | string (2–120) | Tenant name in Arabic |
| `preferredLanguage` | `"en"` \| `"ar"` | Default language |
| `status` | `"active"` \| `"suspended"` \| `"inactive"` | Tenant lifecycle status |

**Response** `200 OK` — updated tenant object

**Error responses**

| Status | errorCode | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | No fields provided, or invalid values |
| 404 | `NOT_FOUND` | Tenant does not exist |

---

## Permissions

All endpoints require a valid platform admin JWT (`scope: "platform"`). The `platform.middleware` enforces this.

---

## Tenant / branch scope

This module lives in the platform domain. There is no `tenantId` or `branchId` scoping on these routes — platform admins can view and manage all tenants.

---

## Side effects

- `POST /api/v1/platform/tenants`:
  - Creates a `TenantSettings` record (linked to the new tenant, `onDelete: Cascade`).
  - Creates a `Subscription` record in `trialing` status (linked to both the tenant and the selected plan).
  - `trialEndsAt` on both `Tenant` and `Subscription` is computed as `now + plan.trialDays * 86400s`.

---

## Related modules

| Module | Relationship |
|---|---|
| `platform/plans` | Plan must exist and be active to create a tenant |
| `platform/subscriptions` | Trial subscription created here; further billing managed in subscriptions module (Phase 1, Slice 8+) |
| `tenant/auth` | Tenant users authenticate against the tenant created here (Phase 2) |
| `tenant/settings` | `TenantSettings` is seeded here with defaults; editable by tenant admin in Phase 2 |
