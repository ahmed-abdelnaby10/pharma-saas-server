# Global Catalog Module

## Purpose

A platform-managed master catalog of pharmaceutical and cosmetic products. Platform admins create and maintain items; external sources can be synced on demand; tenants can suggest new items (crowdsource flow). Tenants browse active items plus their own pending suggestions. The catalog is global — not tenant-scoped.

## Dependencies

- **Platform admin JWT** — write / sync / review operations
- **Tenant JWT** — read + suggest operations
- `prisma.catalogItem` model
- `csv-parse` npm package (EDA CSV import)
- OpenFDA public API (no key required)
- Open Beauty Facts public API (no key required)

## Catalog Item Fields

| Field                | Type                                           | Notes                                   |
|----------------------|------------------------------------------------|-----------------------------------------|
| id                   | cuid                                           |                                         |
| nameEn               | string                                         |                                         |
| nameAr               | string                                         |                                         |
| genericNameEn        | string?                                        |                                         |
| genericNameAr        | string?                                        |                                         |
| barcode              | string? (unique)                               | EAN/UPC                                 |
| sku                  | string? (unique)                               |                                         |
| category             | string?                                        | Free text                               |
| unitOfMeasure        | string                                         | Default `"unit"`                        |
| dosageForm           | string?                                        | e.g. `tablet`, `syrup`, `cream`         |
| strength             | string?                                        | e.g. `500mg`, `10%`                     |
| manufacturer         | string?                                        |                                         |
| description          | string?                                        |                                         |
| scientificName       | string?                                        | Generic / INN name                      |
| atcCode              | string?                                        | WHO ATC code e.g. `N02BE01`             |
| requiresPrescription | boolean                                        | Default `false`                         |
| imageUrl             | string?                                        |                                         |
| status               | `PENDING_REVIEW \| ACTIVE \| REJECTED`         | Default `ACTIVE` for platform, `PENDING_REVIEW` for tenant suggestions |
| productType          | `MEDICINE \| COSMETIC \| SUPPLEMENT \| MEDICAL_DEVICE \| OTHER` | Default `MEDICINE` |
| isActive             | boolean                                        | Soft-delete flag                        |
| source               | `MANUAL \| OPENFDA \| OPENBEAUTY \| EDA \| TENANT` | Origin of the record               |
| sourceId             | string? (unique)                               | Dedup key from external source          |
| lastSyncedAt         | DateTime?                                      | Updated on every sync upsert            |
| submittedByTenantId  | string?                                        | FK → Tenant (tenant suggestions)        |
| verifiedAt           | DateTime?                                      | Set on approve/reject                   |
| verifiedById         | string?                                        | Soft ref → PlatformAdmin.id             |

---

## Platform Endpoints (admin only)

### `POST /platform/catalog`

Create a new catalog item. Status defaults to `ACTIVE`.

**Auth:** Platform admin JWT

**Body:**

| Field                | Type    | Required | Rules                                       |
|----------------------|---------|----------|---------------------------------------------|
| nameEn               | string  | Yes      | 2–255 chars                                 |
| nameAr               | string  | Yes      | 2–255 chars                                 |
| genericNameEn        | string  | No       | 2–255 chars                                 |
| genericNameAr        | string  | No       | 2–255 chars                                 |
| barcode              | string  | No       | 1–100 chars, globally unique                |
| sku                  | string  | No       | 1–100 chars, globally unique                |
| category             | string  | No       | 2–100 chars                                 |
| unitOfMeasure        | string  | Yes      | 1–64 chars (e.g. `tablet`, `ml`)            |
| dosageForm           | string  | No       | 2–100 chars                                 |
| strength             | string  | No       | 1–64 chars (e.g. `500mg`)                   |
| manufacturer         | string  | No       | 2–255 chars                                 |
| description          | string  | No       | Up to 2000 chars                            |
| scientificName       | string  | No       | 2–255 chars                                 |
| atcCode              | string  | No       | 1–20 chars (e.g. `N02BE01`)                 |
| requiresPrescription | boolean | No       | Default `false`                             |
| imageUrl             | string  | No       | Must be a valid URL                         |
| productType          | enum    | No       | One of the `CatalogProductType` values      |

**Response `201`:** Catalog item object

**Errors:**
- `409 catalog.barcode_conflict`
- `409 catalog.sku_conflict`

---

### `GET /platform/catalog`

List catalog items with optional filters.

**Auth:** Platform admin JWT

**Query params:**

| Param       | Type    | Description                              |
|-------------|---------|------------------------------------------|
| search      | string  | Full-text search on name / barcode / sku |
| category    | string  | Filter by category                       |
| isActive    | boolean | Filter by active flag                    |
| status      | enum    | `PENDING_REVIEW \| ACTIVE \| REJECTED`   |
| productType | enum    | `MEDICINE \| COSMETIC \| ...`            |
| source      | enum    | `MANUAL \| OPENFDA \| ...`               |

**Response `200`:** Array ordered by `nameEn asc`

---

### `GET /platform/catalog/pending`

List all `PENDING_REVIEW` items (tenant suggestions awaiting admin action).

**Auth:** Platform admin JWT

**Response `200`:** Array ordered by `createdAt asc`

---

### `GET /platform/catalog/:itemId`

Get a single catalog item.

**Errors:** `404 catalog.not_found`

---

### `PATCH /platform/catalog/:itemId`

Update catalog item fields. At least one field required. Pass `null` to clear optional fields.

**Errors:** `404 catalog.not_found`, `409 catalog.barcode_conflict`, `409 catalog.sku_conflict`

---

### `DELETE /platform/catalog/:itemId`

Soft-deactivate (`isActive: false`). Deactivated items hidden from tenants.

**Errors:** `404 catalog.not_found`, `409 catalog.already_inactive`

---

### `POST /platform/catalog/:itemId/approve`

Approve a `PENDING_REVIEW` item. Sets `status → ACTIVE`, records `verifiedAt` and `verifiedById`.

**Auth:** Platform admin JWT  
**Body:** `{ reason?: string }` (optional)

**Errors:** `404 catalog.not_found`, `400` if status is not `PENDING_REVIEW`

---

### `POST /platform/catalog/:itemId/reject`

Reject a `PENDING_REVIEW` item. Sets `status → REJECTED`.

**Auth:** Platform admin JWT  
**Body:** `{ reason?: string }` — stored in `description` if provided

**Errors:** `404 catalog.not_found`, `400` if status is not `PENDING_REVIEW`

---

## External Sync Endpoints (platform admin, manual triggers)

All three sync endpoints are **idempotent** — re-running them upserts records by `sourceId`. They return a `SyncResult`:

```json
{
  "added":   120,
  "updated": 45,
  "skipped": 3,
  "errors":  1,
  "total":   169
}
```

### `POST /platform/catalog/sync/openfda`

Sync medicines from [OpenFDA NDC database](https://open.fda.gov/apis/drug/ndc/).  
Free, no API key. Covers ~130k US branded and generic medicines.

**Query params:**
| Param | Type   | Default | Description                  |
|-------|--------|---------|------------------------------|
| limit | number | 5000    | Max items to fetch (≤ 50000) |

**Source:** `OPENFDA` · **ProductType:** `MEDICINE`

---

### `POST /platform/catalog/sync/openbeauty`

Sync cosmetics from [Open Beauty Facts](https://world.openbeautyfacts.org/).  
Free, no API key. Covers ~2.5M cosmetic products worldwide.

**Query params:**
| Param | Type   | Default | Description                  |
|-------|--------|---------|------------------------------|
| limit | number | 2000    | Max items to fetch (≤ 50000) |

**Source:** `OPENBEAUTY` · **ProductType:** `COSMETIC`

---

### `POST /platform/catalog/sync/eda`

Import from an EDA (Egyptian Drug Authority) CSV file already on the server.

**Body:**
| Field    | Type   | Required | Description                                 |
|----------|--------|----------|---------------------------------------------|
| filePath | string | Yes      | Absolute path to the CSV file on the server |

**CSV columns expected (header row required):**  
`reg_no`, `nameAr`, `nameEn`, `genericNameAr`, `genericNameEn`, `manufacturer`, `dosageForm`, `strength`, `category`, `requiresPrescription`

**Source:** `EDA` · **ProductType:** `MEDICINE`

---

## Tenant Endpoints

### `GET /tenant/catalog`

Returns ACTIVE items + the calling tenant's own PENDING_REVIEW suggestions.  
Never returns REJECTED items or other tenants' suggestions.

**Auth:** Tenant JWT  
**Permission:** `catalog:read`

**Query params:**
| Param  | Type   | Description                              |
|--------|--------|------------------------------------------|
| search | string | Full-text search on name / barcode / sku |

---

### `GET /tenant/catalog/:itemId`

Get a single active catalog item.

**Auth:** Tenant JWT  
**Permission:** `catalog:read`

---

### `POST /tenant/catalog/suggest`

Submit a catalog item suggestion. If a barcode match already exists, returns the existing item (`200`). Otherwise creates a `PENDING_REVIEW` item (`201`).

**Auth:** Tenant JWT  
**Permission:** `catalog:suggest`

**Body:**

| Field                | Type    | Required | Rules                                  |
|----------------------|---------|----------|----------------------------------------|
| nameEn               | string  | Yes      | 2–255 chars                            |
| nameAr               | string  | Yes      | 2–255 chars                            |
| barcode              | string  | No       | 1–100 chars — used for dedup           |
| genericNameEn        | string  | No       |                                        |
| genericNameAr        | string  | No       |                                        |
| category             | string  | No       |                                        |
| unitOfMeasure        | string  | No       | Default `"unit"`                       |
| dosageForm           | string  | No       |                                        |
| strength             | string  | No       |                                        |
| manufacturer         | string  | No       |                                        |
| requiresPrescription | boolean | No       |                                        |
| productType          | enum    | No       | Default `MEDICINE`                     |

**Tenant visibility after suggest:** The submitted item is immediately visible on the tenant's own `GET /tenant/catalog` as `status: PENDING_REVIEW`. Platform admin must approve before it becomes visible to all tenants.

---

## Crowdsource Review Flow

```
Tenant adds PO item / suggests item
  → POST /tenant/catalog/suggest
    → if barcode exists → return existing (idempotent)
    → else → create CatalogItem { status: PENDING_REVIEW, source: TENANT, submittedByTenantId }

Platform admin reviews
  → GET /platform/catalog/pending
  → POST /platform/catalog/:itemId/approve   (status → ACTIVE, visible to all)
  → POST /platform/catalog/:itemId/reject    (status → REJECTED, hidden everywhere)
```

---

## Default Permissions by Role

| Role            | catalog:read | catalog:suggest |
|-----------------|:------------:|:---------------:|
| tenant_owner    | ✓            | ✓               |
| tenant_manager  | ✓            | ✓               |
| pharmacist      | ✓            | ✓               |
| cashier         | ✓            | —               |
| inventory_clerk | ✓            | ✓               |

---

## Side Effects

- Sync endpoints write directly to the database; no notifications fired.
- Suggest creates a `PENDING_REVIEW` record — no notifications fired (can be added later).
- Approve/reject do not currently notify the submitting tenant (future work).

---

## Related Modules

- **Inventory** — `InventoryItem.catalogItemId` FK
- **Purchasing** — purchase order lines reference catalog items; the `findOrSuggest` helper auto-suggests missing items
- **POS / Sales** — sale lines derived from inventory → catalog chain
