import { Prisma } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { UpdateSettingsDto } from "../dto/update-settings.dto";

const settingsWithTenantSelect = {
  id: true,
  tenantId: true,
  organizationName: true,
  taxId: true,
  phone: true,
  email: true,
  lowStockAlerts: true,
  lowStockThresholdDays: true,
  expiryAlerts: true,
  expiryAlertWindowDays: true,
  purchaseOrderUpdates: true,
  receiptHeader: true,
  receiptFooter: true,
  vatPercentage: true,
  defaultLanguage: true,
  createdAt: true,
  updatedAt: true,
  tenant: {
    select: {
      nameEn: true,
      nameAr: true,
    },
  },
} satisfies Prisma.TenantSettingsSelect;

export type SettingsRecord = Prisma.TenantSettingsGetPayload<{
  select: typeof settingsWithTenantSelect;
}>;

export class SettingsRepository {
  async findByTenant(tenantId: string): Promise<SettingsRecord | null> {
    return prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: settingsWithTenantSelect,
    });
  }

  async update(
    tenantId: string,
    payload: UpdateSettingsDto,
  ): Promise<SettingsRecord> {
    const { nameEn, nameAr, ...settingsPayload } = payload;

    // If nameEn or nameAr are being updated, patch the Tenant record atomically
    return prisma.$transaction(async (tx) => {
      if (nameEn !== undefined || nameAr !== undefined) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            ...(nameEn !== undefined ? { nameEn } : {}),
            ...(nameAr !== undefined ? { nameAr } : {}),
          },
        });
      }

      return tx.tenantSettings.update({
        where: { tenantId },
        data: {
          ...(settingsPayload.organizationName !== undefined
            ? { organizationName: settingsPayload.organizationName }
            : {}),
          ...(settingsPayload.taxId !== undefined
            ? { taxId: settingsPayload.taxId }
            : {}),
          ...(settingsPayload.phone !== undefined
            ? { phone: settingsPayload.phone }
            : {}),
          ...(settingsPayload.email !== undefined
            ? { email: settingsPayload.email }
            : {}),
          ...(settingsPayload.lowStockAlerts !== undefined
            ? { lowStockAlerts: settingsPayload.lowStockAlerts }
            : {}),
          ...(settingsPayload.lowStockThresholdDays !== undefined
            ? { lowStockThresholdDays: settingsPayload.lowStockThresholdDays }
            : {}),
          ...(settingsPayload.expiryAlerts !== undefined
            ? { expiryAlerts: settingsPayload.expiryAlerts }
            : {}),
          ...(settingsPayload.expiryAlertWindowDays !== undefined
            ? { expiryAlertWindowDays: settingsPayload.expiryAlertWindowDays }
            : {}),
          ...(settingsPayload.purchaseOrderUpdates !== undefined
            ? { purchaseOrderUpdates: settingsPayload.purchaseOrderUpdates }
            : {}),
          ...(settingsPayload.receiptHeader !== undefined
            ? { receiptHeader: settingsPayload.receiptHeader }
            : {}),
          ...(settingsPayload.receiptFooter !== undefined
            ? { receiptFooter: settingsPayload.receiptFooter }
            : {}),
          ...(settingsPayload.vatPercentage !== undefined
            ? {
                vatPercentage: new Prisma.Decimal(
                  settingsPayload.vatPercentage,
                ),
              }
            : {}),
          ...(settingsPayload.defaultLanguage !== undefined
            ? { defaultLanguage: settingsPayload.defaultLanguage }
            : {}),
        },
        select: settingsWithTenantSelect,
      });
    });
  }
}

export const settingsRepository = new SettingsRepository();
