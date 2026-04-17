-- AlterTable
ALTER TABLE "TenantUser" ADD COLUMN     "branchId" TEXT;

-- CreateIndex
CREATE INDEX "TenantUser_tenantId_branchId_idx" ON "TenantUser"("tenantId", "branchId");

-- AddForeignKey
ALTER TABLE "TenantUser" ADD CONSTRAINT "TenantUser_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
