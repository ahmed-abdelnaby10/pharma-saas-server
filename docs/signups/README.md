# Signups Module

## Purpose
Allows pharmacy owners to self-register by submitting a signup request. Platform admins review and approve or reject it. Approval creates a full tenant account with a trialing subscription — no manual admin SQL required.

## Dependencies
- `Plan` — signup must reference a valid, active plan
- `Tenant` / `Subscription` — created automatically on approval via `tenantsRepository.createWithTransaction`

## Endpoints

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/signups` | Submit a signup request |

### Platform Admin (Bearer platformToken)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/platform/signups` | List all requests (filter by status) |
| GET | `/api/v1/platform/signups/:id` | Get a single request |
| POST | `/api/v1/platform/signups/:id/approve` | Approve → creates tenant |
| POST | `/api/v1/platform/signups/:id/reject` | Reject with reason |

## Request Body — Submit

```json
{
  "planId": "string (required)",
  "fullName": "string (required)",
  "email": "string email (required)",
  "phone": "string (optional)",
  "pharmacyNameEn": "string (required)",
  "pharmacyNameAr": "string (required)",
  "notes": "string (optional, max 1000)"
}
```

## Request Body — Reject

```json
{
  "rejectionReason": "string (required, min 5 chars)"
}
```

## Status Lifecycle

```
PENDING → APPROVED (tenant created, subscription starts trialing)
PENDING → REJECTED (with rejection reason)
```

## Side Effects on Approval
1. `Tenant` created (nameEn, nameAr from request, preferredLanguage: `en`)
2. `TenantSettings` created (default language)
3. `Subscription` created with status `trialing` + `trialEndsAt = now + plan.trialDays`
4. `TenantSignupRequest.tenantId` linked to new tenant

## Duplicate Prevention
Only one PENDING request per email is allowed. A second submission from the same email returns `409 Conflict` with code `signup.duplicate`.

## Permissions
- Submit: none (public)
- List / Get / Approve / Reject: platform admin JWT (`isPlatformAdmin: true`)
