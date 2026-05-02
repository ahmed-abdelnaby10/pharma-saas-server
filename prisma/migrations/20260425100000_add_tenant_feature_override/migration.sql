-- CreateTable
CREATE TABLE "TenantFeatureOverride" (
    "id"         TEXT NOT NULL,
    "tenantId"   TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled"    BOOLEAN NOT NULL DEFAULT true,
    "limitValue" INTEGER,
    "reason"     TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantFeatureOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantFeatureOverride_tenantId_featureKey_key"
    ON "TenantFeatureOverride"("tenantId", "featureKey");

-- CreateIndex
CREATE INDEX "TenantFeatureOverride_tenantId_idx"
    ON "TenantFeatureOverride"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantFeatureOverride"
    ADD CONSTRAINT "TenantFeatureOverride_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
