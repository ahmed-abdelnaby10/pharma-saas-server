# Signups Module

## Purpose
Allows pharmacy owners to self-register by submitting a signup request. Platform admins review and approve or reject it. Approval creates a full tenant account with a trialing subscription — no manual admin SQL required.

## Dependencies
- `Plan` — signup must reference a valid, active plan; `plan.trialDays` drives the trial window length
- `Tenant` / `Subscription` — created atomically on approval via `tenantsRepository.createWithTransaction`
- `core/audit/audit-logger` — fire-and-forget `logAudit()` called on both approve and reject
- `core/notifications/notification-sender` — fire-and-forget `notifySignupApproval()` stub called on approval (logs intent until email service is wired up)

## Endpoints

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/signups` | Submit a signup request |

### Platform Admin (Bearer platformToken)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/platform/signups` | List all requests (filterable by status / search) |
| GET | `/api/v1/platform/signups/:id` | Get a single request |
| POST | `/api/v1/platform/signups/:id/approve` | Approve → creates tenant + fires audit + fires notifications |
| POST | `/api/v1/platform/signups/:id/reject` | Reject with reason + fires audit |

## Headers

| Header | Endpoints | Value |
|--------|-----------|-------|
| `Authorization` | All platform-admin routes | `Bearer <platformToken>` |
| `Content-Type` | POST with body | `application/json` |
| `Accept-Language` | All | `en` or `ar` (controls response message locale) |

## Request Body — Submit

```json
{
  "planId": "string (required)",
  "fullName": "string (required, 2–120 chars)",
  "email": "string email (required)",
  "phone": "string (optional)",
  "pharmacyNameEn": "string (required, 2–120 chars)",
  "pharmacyNameAr": "string (required, 2–120 chars)",
  "preferredLanguage": "en | ar (optional, default: en)",
  "notes": "string (optional, max 1000 chars)"
}
```

`preferredLanguage` is stored on the signup request and propagated to the new `Tenant.preferredLanguage` and `TenantSettings.defaultLanguage` on approval.

## Request Body — Reject

```json
{
  "rejectionReason": "string (required, min 5 chars)"
}
```

## Response Shape

All responses follow the standard envelope:

```json
{
  "success": true,
  "message": "...",
  "data": {
    "id": "clxxx",
    "planId": "clyyy",
    "plan": { "id": "clyyy", "code": "starter", "name": "Starter", "trialDays": 30 },
    "fullName": "Ahmed Hassan",
    "email": "ahmed@royalpharmacy.eg",
    "phone": "+20100123456",
    "pharmacyNameEn": "Royal Pharmacy",
    "pharmacyNameAr": "الصيدلية الملكية",
    "preferredLanguage": "ar",
    "notes": "Two branches in Cairo",
    "status": "PENDING",
    "reviewedById": null,
    "reviewedAt": null,
    "rejectionReason": null,
    "tenantId": null,
    "createdAt": "2026-05-06T14:00:00.000Z",
    "updatedAt": "2026-05-06T14:00:00.000Z"
  }
}
```

After approval `status` becomes `"APPROVED"`, `tenantId` is populated, and `reviewedById` / `reviewedAt` are set.

## Status Lifecycle

```
PENDING → APPROVED  (tenant created, subscription starts trialing)
PENDING → REJECTED  (rejectionReason recorded)
```

A request can only transition once. Attempting to approve or reject a non-PENDING request returns `400` with code `signup.not_pending`.

## Side Effects on Approval

The approval is **not** wrapped in a single transaction — the tenant creation is atomic, and the audit / notification calls are fire-and-forget so they never block or roll back the main flow.

### Atomic transaction (via `createWithTransaction`)
1. `Tenant` created — `nameEn`, `nameAr`, and `preferredLanguage` come directly from the signup request.
2. `TenantSettings` created — `defaultLanguage` set to `request.preferredLanguage` (was previously hardcoded `"en"`).
3. `Subscription` created — status `trialing`, `trialEndsAt = now + plan.trialDays` (was previously hardcoded 14 days regardless of the plan).
4. `TenantSignupRequest.tenantId` linked to the new tenant.

### Fire-and-forget (after transaction commits)
5. **Audit log** — `logAudit()` writes an `AuditLog` row:
   - `actorType`: `PLATFORM_ADMIN`
   - `action`: `signup.approve`
   - `resource`: `TenantSignupRequest`
   - `resourceId`: signup request id
   - `tenantId`: newly created tenant id
   - `metadata`: email, pharmacyNameEn/Ar, planCode, trialDays, preferredLanguage
6. **Notification stub** — `notifySignupApproval()` logs the intent to send:
   - Tenant welcome email (to applicant's email, in their preferred language)
   - Platform admin confirmation email
   
   Both log `[TODO]` entries at `info` level and are ready for a real mailer to be wired in. No `Notification` inbox record is created at this stage because no `TenantUser` exists yet — that will happen during tenant admin onboarding.

## Side Effects on Rejection

1. `TenantSignupRequest` status → `REJECTED`, `rejectionReason` and `reviewedAt` recorded.
2. **Audit log** — `logAudit()` records `signup.reject` with rejectionReason in metadata.

## Duplicate Prevention
Only one PENDING request per email is allowed. A second submission from the same email returns `409 Conflict` with code `signup.duplicate`.

## Query Params — List

| Param | Type | Description |
|-------|------|-------------|
| `status` | `PENDING \| APPROVED \| REJECTED` | Filter by status |
| `search` | string | Full-text search across fullName, email, pharmacyNameEn, pharmacyNameAr |

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `plan.not_found` | 404 | planId does not exist |
| `plan.inactive` | 409 | Plan exists but is not active |
| `signup.duplicate` | 409 | PENDING request already exists for this email |
| `signup.not_found` | 404 | Request ID not found |
| `signup.not_pending` | 400 | Approve/reject called on non-PENDING request |

## Permissions
- Submit: none (public route, no auth required)
- List / Get / Approve / Reject: platform admin JWT (`isPlatformAdmin: true`, scope `platform`)

## Related Modules
- **Plans** — `plan.trialDays` drives the trial window; must be active for submission
- **Tenants** — approval creates a new tenant row
- **Subscriptions** — created inline in the approval transaction
- **Audit Logs** — every approve/reject action is recorded
- **Notification sender** — email stubs in `src/core/notifications/notification-sender.ts`
