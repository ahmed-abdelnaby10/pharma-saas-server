# Tenant Settings Module

## Purpose

Exposes the `TenantSettings` record for self-service reads and updates by tenant users. Settings are created automatically when a tenant is provisioned (Slice 7 — tenants module). Only one settings record exists per tenant.

## Dependencies

- **Tenant auth** — all routes require a tenant JWT (`Authorization: Bearer <token>`)
- `prisma.tenantSettings` model — no schema change in this slice

## Tenant Scope

- `tenantId` always comes from the JWT, never from the request body or URL
- Each tenant has exactly one settings record

---

## Endpoints

### `GET /tenant/settings`

Retrieve the current tenant's settings.

**Auth:** Tenant JWT required

**Response `200`:**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "cuid",
    "tenantId": "cuid",
    "organizationName": "Al Shifa Pharmacy",
    "taxId": "300123456789",
    "phone": "+966512345678",
    "email": "info@alshifa.sa",
    "lowStockAlerts": true,
    "expiryAlerts": true,
    "purchaseOrderUpdates": true,
    "receiptHeader": "Welcome to Al Shifa",
    "receiptFooter": "Thank you for your visit",
    "vatPercentage": "15.00",
    "defaultLanguage": "ar",
    "createdAt": "2026-04-16T00:00:00.000Z",
    "updatedAt": "2026-04-16T00:00:00.000Z"
  }
}
```

**Errors:**
- `404 settings.not_found` — should never occur in normal operation (settings are created with the tenant)

---

### `PATCH /tenant/settings`

Update one or more settings fields. All fields are optional; at least one must be provided.

**Auth:** Tenant JWT required

**Body (all optional, at least one required):**

| Field               | Type           | Rules                              |
|---------------------|----------------|------------------------------------|
| organizationName    | string \| null | 1–255 chars, or null to clear      |
| taxId               | string \| null | 1–64 chars, or null to clear       |
| phone               | string \| null | 5–30 chars, or null to clear       |
| email               | string \| null | valid email, or null to clear      |
| lowStockAlerts      | boolean        | Enable/disable low stock alerts    |
| expiryAlerts        | boolean        | Enable/disable expiry alerts       |
| purchaseOrderUpdates| boolean        | Enable/disable PO notifications    |
| receiptHeader       | string \| null | Max 1000 chars, or null to clear   |
| receiptFooter       | string \| null | Max 1000 chars, or null to clear   |
| vatPercentage       | number         | 0–100                              |
| defaultLanguage     | string         | `"en"` or `"ar"`                  |

**Response `200`:** Updated settings object

**Notes:**
- `vatPercentage` is stored as `Decimal(5,2)` and returned as a string (e.g. `"15.00"`)
- Pass `null` for nullable string fields to explicitly clear them

**Errors:**
- `400 validation` — invalid field values or no fields provided

---

## Side Effects

- `defaultLanguage` affects the language resolution chain for tenant users who have no `preferredLanguage` set
- Alert toggles (`lowStockAlerts`, `expiryAlerts`, `purchaseOrderUpdates`) will be consulted by the alerts module (Phase 5)
- `vatPercentage` will be used by POS / sales module (Phase 4) to calculate VAT on receipts

## Related Modules

- **Tenants** (platform) — creates settings during tenant provisioning
- **POS / Sales** — reads `vatPercentage`
- **Alerts** — reads alert toggle flags
- **i18n** — `defaultLanguage` feeds the language resolution chain
