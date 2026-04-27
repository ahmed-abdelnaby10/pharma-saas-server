-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('PENDING', 'DISPENSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Prescription" (
    "id"                 TEXT NOT NULL,
    "tenantId"           TEXT NOT NULL,
    "branchId"           TEXT NOT NULL,
    "patientId"          TEXT,
    "saleId"             TEXT,
    "prescriptionNumber" TEXT,
    "doctorName"         TEXT,
    "doctorLicense"      TEXT,
    "status"             "PrescriptionStatus" NOT NULL DEFAULT 'PENDING',
    "issuedAt"           TIMESTAMP(3),
    "dispensedAt"        TIMESTAMP(3),
    "notes"              TEXT,
    "ocrDocumentId"      TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id"                 TEXT NOT NULL,
    "prescriptionId"     TEXT NOT NULL,
    "drugName"           TEXT NOT NULL,
    "quantity"           DECIMAL(12,3) NOT NULL,
    "dosageInstructions" TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_saleId_key" ON "Prescription"("saleId");

-- CreateIndex
CREATE INDEX "Prescription_tenantId_idx" ON "Prescription"("tenantId");

-- CreateIndex
CREATE INDEX "Prescription_tenantId_branchId_idx" ON "Prescription"("tenantId", "branchId");

-- CreateIndex
CREATE INDEX "Prescription_tenantId_patientId_idx" ON "Prescription"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "Prescription_tenantId_status_idx" ON "Prescription"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_saleId_fkey"
    FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey"
    FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
