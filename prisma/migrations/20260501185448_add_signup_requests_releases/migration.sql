-- CreateEnum
CREATE TYPE "SignupRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReleaseChannel" AS ENUM ('STABLE', 'BETA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'TRIAL_EXPIRY_WARNING';
ALTER TYPE "NotificationType" ADD VALUE 'SUBSCRIPTION_EXPIRED';

-- DropIndex
DROP INDEX "Sale_patientId_idx";

-- CreateTable
CREATE TABLE "TenantSignupRequest" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "pharmacyNameEn" TEXT NOT NULL,
    "pharmacyNameAr" TEXT NOT NULL,
    "notes" TEXT,
    "status" "SignupRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSignupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppRelease" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "channel" "ReleaseChannel" NOT NULL DEFAULT 'STABLE',
    "notes" TEXT,
    "windowsUrl" TEXT,
    "macUrl" TEXT,
    "linuxUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppRelease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantSignupRequest_status_idx" ON "TenantSignupRequest"("status");

-- CreateIndex
CREATE INDEX "TenantSignupRequest_email_idx" ON "TenantSignupRequest"("email");

-- CreateIndex
CREATE INDEX "TenantSignupRequest_createdAt_idx" ON "TenantSignupRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppRelease_version_key" ON "AppRelease"("version");

-- CreateIndex
CREATE INDEX "AppRelease_channel_isActive_idx" ON "AppRelease"("channel", "isActive");

-- CreateIndex
CREATE INDEX "AppRelease_publishedAt_idx" ON "AppRelease"("publishedAt");

-- AddForeignKey
ALTER TABLE "TenantSignupRequest" ADD CONSTRAINT "TenantSignupRequest_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSignupRequest" ADD CONSTRAINT "TenantSignupRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
