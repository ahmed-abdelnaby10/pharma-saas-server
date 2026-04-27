-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
    'LOW_STOCK',
    'EXPIRY_ALERT',
    'OCR_COMPLETED',
    'OCR_FAILED',
    'SHIFT_OPENED',
    'SHIFT_CLOSED',
    'PURCHASE_ORDER_RECEIVED',
    'GENERAL'
);

-- CreateTable
CREATE TABLE "Notification" (
    "id"        TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "type"      "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "title"     TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "metadata"  JSONB,
    "isRead"    BOOLEAN NOT NULL DEFAULT false,
    "readAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_tenantId_userId_isRead_idx" ON "Notification"("tenantId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_tenantId_userId_createdAt_idx" ON "Notification"("tenantId", "userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "TenantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
