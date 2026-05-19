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

### `POST /platform/catalog/sync/eda` — Egyptian medicines CSV

Import Egyptian medicines from a CSV file on the server. The endpoint name is `eda` for backward compatibility, but it now **auto-detects the CSV format** and accepts either:

1. **Kaggle "Medicines from Egyptian Pharmacies"** (recommended primary source). This dataset is scraped from real Egyptian pharmacy sales, so it covers **both EDA-registered AND imported medicines** — solving the gap where official EDA registry misses imported drugs.
2. **Legacy EDA-format CSV** (only if you somehow obtain one — the EDA does not publish official bulk exports).

**Body:**
| Field    | Type   | Required | Description                                 |
|----------|--------|----------|---------------------------------------------|
| filePath | string | Yes      | Absolute path to the CSV file on the server |

**Auto-detection rules:**
- Presence of a `Drug Name` column → Kaggle format → tagged `source: KAGGLE_PHARMACY`
- Presence of a `reg_no` column → EDA format → tagged `source: EDA`
- Neither → request fails with an explanatory error

#### Kaggle "Medicines from Egyptian Pharmacies" columns

Download from: [kaggle.com/datasets/younaniskander/medicines-from-egyptian-pharmacies](https://www.kaggle.com/datasets/younaniskander/medicines-from-egyptian-pharmacies)

Expected headers (header row required, column order doesn't matter, headers are case-insensitive):
`Drug Name`, `Price`, `Form`, `Company`, `Category`, `Region`, `Date`, `Time`

Mapping:
| CSV column | CatalogItem field          |
|------------|----------------------------|
| Drug Name  | nameEn (also nameAr)       |
| Form       | dosageForm                 |
| Company    | manufacturer               |
| Category   | category                   |
| Price      | ignored (per-tenant pricing) |

**Dedup key:** `drug_name + form + company` (case-insensitive). Re-running the sync upserts duplicates.

**Gaps:** No `barcode`, no Arabic name, no `genericName`. These are filled later by:
- The OpenFDA sync (matches generic_name → adds barcode + atcCode)
- The tenant `POST /tenant/catalog/suggest` crowdsource flow (adds barcodes from real scans)

#### Legacy EDA-format columns

Expected headers:
`reg_no`, `nameAr`, `nameEn`, `genericNameAr`, `genericNameEn`, `manufacturer`, `dosageForm`, `strength`, `category`, `requiresPrescription`

**Source:** `KAGGLE_PHARMACY` or `EDA` (auto-tagged) · **ProductType:** `MEDICINE`

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

### `POST /tenant/catalog/lookup-barcode`

POS / receiving-side barcode lookup. Designed for the cashier-scan flow.

**Auth:** Tenant JWT  
**Permission:** `catalog:suggest`

**Body:**
| Field   | Type   | Required | Rules            |
|---------|--------|----------|------------------|
| barcode | string | Yes      | 8–14 digits only |

**Behaviour (lookup chain):**

1. **Local DB hit** — if the barcode is already in our catalog, return it as-is.
2. **External provider hit** — try in order:
   - **OpenFDA NDC** (best for US-registered medicines)
   - **Open Beauty Facts** (best for cosmetics)
   - **GS1 / commercial proxy** (only if `GS1_LOOKUP_URL` env var is set — see Configuration below)
   
   On the first hit, auto-create a `PENDING_REVIEW` catalog item populated with the provider's name / manufacturer / category / image / etc., attribute it to the calling tenant, and return it.
3. **Nothing found** — return `404` with `{ origin: "not_found" }` so the frontend can fall back to the manual `POST /tenant/catalog/suggest` form.

**Response shape:**

```json
{
  "data": {
    "origin":   "existing" | "external_provider" | "not_found",
    "provider": "openfda" | "openbeauty" | "gs1" | null,
    "item":     <CatalogItem | null>
  }
}
```

**Status codes:**
- `200` — already existed in our catalog (`origin: existing`)
- `201` — newly imported from an external provider (`origin: external_provider`)
- `404` — no match found anywhere

**Configuration:**

| Env var          | Default | Effect                                                            |
|------------------|---------|-------------------------------------------------------------------|
| `GS1_LOOKUP_URL` | unset   | When set, BarcodeLookupService issues GET to `${url}?gtin=<barcode>` and expects a JSON body with `brandName`, `companyName`, `productDescription`, `gpcCategoryDescription`. Point this at GS1 GEPIR, Barcode Lookup API, or your own proxy. |

The official "Verified by GS1" public web form (`gs1.org/services/verified-by-gs1/results`) has anti-bot/captcha protection and is **not** suitable for direct server-side calls. Use a paid API or your own proxy via `GS1_LOOKUP_URL`.

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

## Bootstrap Workflow for Egyptian Pharmacies

The Egyptian Drug Authority (EDA) does **not** publish a public bulk export and its registry only covers officially registered drugs — many imported medicines sold in real Egyptian pharmacies are missing from it. The recommended bootstrap is:

1. **Download** the Kaggle dataset (free, Kaggle account required):  
   [Medicines from Egyptian Pharmacies](https://www.kaggle.com/datasets/younaniskander/medicines-from-egyptian-pharmacies)
2. **Place** the CSV somewhere on your server, e.g. `/var/data/seed/egypt_pharmacy_medicines.csv`
3. **Call** `POST /platform/catalog/sync/eda` with `{"filePath": "/var/data/seed/egypt_pharmacy_medicines.csv"}`
4. **Run OpenFDA sync** (`POST /platform/catalog/sync/openfda?limit=5000`) — wherever generic names match it enriches the Kaggle rows with barcodes and ATC codes.
5. **Run Open Beauty Facts sync** for cosmetics: `POST /platform/catalog/sync/openbeauty?limit=2000`
6. **Tenants take it from there** — every time they scan a barcode that's missing, `POST /tenant/catalog/suggest` adds it. Platform admins approve via `POST /platform/catalog/:itemId/approve`.

> **Licensing note:** Verify the Kaggle dataset's licence and the underlying source's ToS before production / commercial use. For prototyping and self-hosted deployments it is fine.

## Related Modules

- **Inventory** — `InventoryItem.catalogItemId` FK
- **Purchasing** — purchase order lines reference catalog items; the `findOrSuggest` helper auto-suggests missing items
- **POS / Sales** — sale lines derived from inventory → catalog chain
