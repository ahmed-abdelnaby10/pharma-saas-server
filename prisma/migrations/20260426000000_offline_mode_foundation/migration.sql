-- Add RECONCILIATION movement types
ALTER TYPE "StockMovementType" ADD VALUE 'RECONCILIATION_IN';
ALTER TYPE "StockMovementType" ADD VALUE 'RECONCILIATION_OUT';

-- Add clientCreatedAt to StockMovement
ALTER TABLE "StockMovement" ADD COLUMN "clientCreatedAt" TIMESTAMP(3);

-- Add clientCreatedAt + clientClosedAt to Shift
ALTER TABLE "Shift" ADD COLUMN "clientCreatedAt" TIMESTAMP(3);
ALTER TABLE "Shift" ADD COLUMN "clientClosedAt"  TIMESTAMP(3);

-- Add clientCreatedAt to Sale
ALTER TABLE "Sale" ADD COLUMN "clientCreatedAt" TIMESTAMP(3);

-- CreateTable Device
CREATE TABLE "Device" (
    "id"           TEXT NOT NULL,
    "tenantId"     TEXT NOT NULL,
    "branchId"     TEXT NOT NULL,
    "fingerprint"  TEXT NOT NULL,
    "label"        TEXT,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt"   TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Device_tenantId_fingerprint_key" ON "Device"("tenantId", "fingerprint");
CREATE INDEX "Device_tenantId_idx"          ON "Device"("tenantId");
CREATE INDEX "Device_tenantId_branchId_idx" ON "Device"("tenantId", "branchId");
CREATE INDEX "Device_tenantId_isActive_idx" ON "Device"("tenantId", "isActive");

ALTER TABLE "Device" ADD CONSTRAINT "Device_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Device" ADD CONSTRAINT "Device_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
