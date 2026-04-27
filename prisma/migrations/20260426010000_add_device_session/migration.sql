-- CreateTable
CREATE TABLE "DeviceSession" (
    "id"        TEXT NOT NULL,
    "deviceId"  TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceSession_tokenHash_key" ON "DeviceSession"("tokenHash");
CREATE INDEX "DeviceSession_tenantId_idx"  ON "DeviceSession"("tenantId");
CREATE INDEX "DeviceSession_expiresAt_idx" ON "DeviceSession"("expiresAt");

ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "TenantUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
