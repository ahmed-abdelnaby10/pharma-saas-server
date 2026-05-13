-- Migration: expand_catalog_item
-- Adds new enums and columns to support crowdsourced catalog,
-- external sync (OpenFDA, Open Beauty Facts, EDA), and platform review flow.

-- ── New enums ────────────────────────────────────────────────────────────────

CREATE TYPE "CatalogItemStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'REJECTED');
CREATE TYPE "CatalogProductType" AS ENUM ('MEDICINE', 'COSMETIC', 'SUPPLEMENT', 'MEDICAL_DEVICE', 'OTHER');
CREATE TYPE "CatalogSource" AS ENUM ('MANUAL', 'OPENFDA', 'OPENBEAUTY', 'EDA', 'TENANT');

-- ── New columns on CatalogItem ───────────────────────────────────────────────

ALTER TABLE "CatalogItem"
  ADD COLUMN "description"          TEXT,
  ADD COLUMN "scientificName"       TEXT,
  ADD COLUMN "atcCode"              TEXT,
  ADD COLUMN "requiresPrescription" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "imageUrl"             TEXT,
  ADD COLUMN "status"               "CatalogItemStatus"  NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "productType"          "CatalogProductType" NOT NULL DEFAULT 'MEDICINE',
  ADD COLUMN "source"               "CatalogSource"      NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "sourceId"             TEXT,
  ADD COLUMN "lastSyncedAt"         TIMESTAMP(3),
  ADD COLUMN "submittedByTenantId"  TEXT,
  ADD COLUMN "verifiedAt"           TIMESTAMP(3),
  ADD COLUMN "verifiedById"         TEXT;

-- Change unitOfMeasure default to 'unit' (previously 'pcs' or unset)
ALTER TABLE "CatalogItem" ALTER COLUMN "unitOfMeasure" SET DEFAULT 'unit';

-- ── Unique constraints ───────────────────────────────────────────────────────

CREATE UNIQUE INDEX "CatalogItem_sourceId_key" ON "CatalogItem"("sourceId")
  WHERE "sourceId" IS NOT NULL;

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX "CatalogItem_status_idx"              ON "CatalogItem"("status");
CREATE INDEX "CatalogItem_source_idx"              ON "CatalogItem"("source");
CREATE INDEX "CatalogItem_productType_idx"         ON "CatalogItem"("productType");
CREATE INDEX "CatalogItem_submittedByTenantId_idx" ON "CatalogItem"("submittedByTenantId");

-- ── Foreign key: submittedByTenantId → Tenant ────────────────────────────────

ALTER TABLE "CatalogItem"
  ADD CONSTRAINT "CatalogItem_submittedByTenantId_fkey"
  FOREIGN KEY ("submittedByTenantId")
  REFERENCES "Tenant"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
