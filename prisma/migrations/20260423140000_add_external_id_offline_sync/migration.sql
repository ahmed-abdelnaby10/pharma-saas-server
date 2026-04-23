-- AlterTable: add externalId (client-generated sync ID) to offline-syncable models
ALTER TABLE "PurchaseOrder" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Sale"          ADD COLUMN "externalId" TEXT;
ALTER TABLE "Shift"         ADD COLUMN "externalId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "externalId" TEXT;

-- CreateIndex: unique per tenant so the same local ID cannot map to two server records
-- NULL values are excluded from uniqueness in PostgreSQL, so existing rows are unaffected.
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_externalId_key" ON "PurchaseOrder"("tenantId", "externalId");
CREATE UNIQUE INDEX "Sale_tenantId_externalId_key"          ON "Sale"("tenantId", "externalId");
CREATE UNIQUE INDEX "Shift_tenantId_externalId_key"         ON "Shift"("tenantId", "externalId");
CREATE UNIQUE INDEX "StockMovement_tenantId_externalId_key" ON "StockMovement"("tenantId", "externalId");
