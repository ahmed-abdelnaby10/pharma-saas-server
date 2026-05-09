-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN "lowStockThresholdDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN "expiryAlertWindowDays" INTEGER NOT NULL DEFAULT 30;
