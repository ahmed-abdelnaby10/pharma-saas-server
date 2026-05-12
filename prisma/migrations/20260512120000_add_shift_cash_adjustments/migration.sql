-- CreateEnum
CREATE TYPE "CashAdjustmentType" AS ENUM ('CASH_IN', 'CASH_OUT');

-- CreateTable
CREATE TABLE "ShiftCashAdjustment" (
    "id"        TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "shiftId"   TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "type"      "CashAdjustmentType" NOT NULL,
    "amount"    DECIMAL(12,2) NOT NULL,
    "reason"    TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftCashAdjustment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShiftCashAdjustment" ADD CONSTRAINT "ShiftCashAdjustment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftCashAdjustment" ADD CONSTRAINT "ShiftCashAdjustment_shiftId_fkey"
    FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftCashAdjustment" ADD CONSTRAINT "ShiftCashAdjustment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "TenantUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ShiftCashAdjustment_tenantId_shiftId_idx" ON "ShiftCashAdjustment"("tenantId", "shiftId");
CREATE INDEX "ShiftCashAdjustment_shiftId_idx" ON "ShiftCashAdjustment"("shiftId");
