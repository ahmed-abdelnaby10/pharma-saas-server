# Global Catalog Module

## Purpose

A platform-managed master catalog of pharmaceutical products (medicines, consumables, medical supplies). Platform admins create and maintain catalog items. Tenants browse it read-only and reference items when creating inventory entries. The catalog is global — not scoped to any tenant.

## Dependencies

- **Platform admin JWT** — write operations (create, update, deactivate)
- **Tenant JWT** — read-only access (list, get)
- `prisma.catalogItem` model

## Scope

- No `tenantId` on `CatalogItem` — global across all tenants
- Tenant list endpoint returns only active items by default
- Platform admin list supports `isActive` filter to see deactivated items

---

## Platform Endpoints (admin only)

### `POST /platform/catalog`

Create a new catalog item.

**Auth:** Platform admin JWT

**Body:**

| Field         | Type   | Required | Rules                              |
|---------------|--------|----------|------------------------------------|
| nameEn        | string | Yes      | 2–255 chars                        |
| nameAr        | string | Yes      | 2–255 chars                        |
| genericNameEn | string | No       | 2–255 chars                        |
| genericNameAr | string | No       | 2–255 chars                        |
| barcode       | string | No       | 1–100 chars, globally unique       |
| sku           | string | No       | 1–100 chars, globally unique       |
| category      | string | No       | 2–100 chars (free text)            |
| unitOfMeasure | string | Yes      | 1–64 chars (e.g. "tablet", "ml")  |
| dosageForm    | string | No       | 2–100 chars (e.g. "tablet", "syrup") |
| strength      | string | No       | 1–64 chars (e.g. "500mg")         |
| manufacturer  | string | No       | 2–255 chars                        |

**Response `201`:** Catalog item object

**Errors:**
- `409 catalog.barcode_conflict`
- `409 catalog.sku_conflict`

---

### `GET /platform/catalog`

List catalog items.

**Auth:** Platform admin JWT

**Query params:**

| Param    | Type    | Description                        |
|----------|---------|------------------------------------|
| search   | string  | Full-text search on name/barcode/sku |
| category | string  | Filter by category                 |
| isActive | boolean | Filter by active status            |

**Response `200`:** Array of catalog items ordered by `nameEn` ascending

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

Soft-deactivate a catalog item (`isActive: false`). Deactivated items are hidden from tenant catalog reads.

**Errors:** `404 catalog.not_found`, `409 catalog.already_inactive`

---

## Tenant Endpoints (read-only)

### `GET /tenant/catalog`

List catalog items. Supports same `search` and `category` query params. `isActive` is unrestricted (tenants can pass it too, though normally they only want active items).

**Auth:** Tenant JWT

---

### `GET /tenant/catalog/:itemId`

Get a single catalog item.

**Auth:** Tenant JWT

---

## Related Modules

- **Inventory** (Phase 3, next slice) — inventory items reference `catalogItemId`
- **Purchasing** — purchase order lines reference catalog items
- **POS / Sales** — sales items derived from inventory which links to catalog
