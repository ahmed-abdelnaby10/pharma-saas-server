-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "quantityOnHand" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "reorderLevel" DECIMAL(12,3),
    "sellingPrice" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_branchId_idx" ON "InventoryItem"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_isActive_idx" ON "InventoryItem"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "InventoryItem_catalogItemId_idx" ON "InventoryItem"("catalogItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_branchId_catalogItemId_key" ON "InventoryItem"("branchId", "catalogItemId");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
