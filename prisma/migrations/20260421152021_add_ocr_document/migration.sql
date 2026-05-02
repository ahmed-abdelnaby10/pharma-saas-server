-- CreateEnum
CREATE TYPE "OcrDocumentType" AS ENUM ('INVOICE', 'PRESCRIPTION');

-- CreateEnum
CREATE TYPE "OcrDocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "OcrDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "documentType" "OcrDocumentType" NOT NULL,
    "status" "OcrDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "extractedData" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OcrDocument_tenantId_branchId_idx" ON "OcrDocument"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "OcrDocument_tenantId_documentType_status_idx" ON "OcrDocument"("tenantId", "documentType", "status");

-- CreateIndex
CREATE INDEX "OcrDocument_createdAt_idx" ON "OcrDocument"("createdAt");

-- AddForeignKey
ALTER TABLE "OcrDocument" ADD CONSTRAINT "OcrDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrDocument" ADD CONSTRAINT "OcrDocument_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrDocument" ADD CONSTRAINT "OcrDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "TenantUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
