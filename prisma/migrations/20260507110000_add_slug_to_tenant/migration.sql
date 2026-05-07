-- Add slug column to Tenant.
-- Existing rows get a slug derived from nameEn. Duplicate base slugs
-- (same pharmacy name) are disambiguated by appending -2, -3, etc.
-- ordered by createdAt so the oldest tenant keeps the clean slug.

ALTER TABLE "Tenant" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';

-- Generate slug from nameEn: lowercase → strip non-alphanumeric → collapse spaces to hyphens
WITH slugged AS (
  SELECT
    id,
    lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(trim("nameEn"), '[^a-zA-Z0-9\s]', '', 'g'),
          '\s+', '-', 'g'
        ),
        '-+', '-', 'g'
      )
    ) AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY lower(
        regexp_replace(
          regexp_replace(
            regexp_replace(trim("nameEn"), '[^a-zA-Z0-9\s]', '', 'g'),
            '\s+', '-', 'g'
          ),
          '-+', '-', 'g'
        )
      )
      ORDER BY "createdAt"
    ) AS rn
  FROM "Tenant"
)
UPDATE "Tenant" t
SET "slug" = CASE
               WHEN s.rn = 1 THEN s.base_slug
               ELSE s.base_slug || '-' || s.rn
             END
FROM slugged s
WHERE t.id = s.id;

-- Now enforce uniqueness and remove the temporary default
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
ALTER TABLE "Tenant" ALTER COLUMN "slug" DROP DEFAULT;
