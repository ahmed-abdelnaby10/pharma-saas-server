-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "Patient" (
    "id"          TEXT NOT NULL,
    "tenantId"    TEXT NOT NULL,
    "fullName"    TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "phone"       TEXT,
    "email"       TEXT,
    "nationalId"  TEXT,
    "gender"      "Gender",
    "notes"       TEXT,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_tenantId_nationalId_key"  ON "Patient"("tenantId", "nationalId");
CREATE INDEX "Patient_tenantId_idx"                    ON "Patient"("tenantId");
CREATE INDEX "Patient_tenantId_isActive_idx"           ON "Patient"("tenantId", "isActive");
CREATE INDEX "Patient_tenantId_fullName_idx"           ON "Patient"("tenantId", "fullName");

-- AddForeignKey
ALTER TABLE "Patient"
    ADD CONSTRAINT "Patient_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add optional patientId to Sale
ALTER TABLE "Sale" ADD COLUMN "patientId" TEXT;

-- CreateIndex
CREATE INDEX "Sale_patientId_idx" ON "Sale"("patientId");

-- AddForeignKey
ALTER TABLE "Sale"
    ADD CONSTRAINT "Sale_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
