-- Add passwordHash to TenantSignupRequest.
-- Existing rows (if any) get an empty string placeholder; the column is
-- populated from this point forward on every new signup submission.
ALTER TABLE "TenantSignupRequest"
  ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';

-- Drop the default so future inserts must supply the value explicitly.
ALTER TABLE "TenantSignupRequest"
  ALTER COLUMN "passwordHash" DROP DEFAULT;
