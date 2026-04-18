import { Prisma, TenantSettings } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { UpdateSettingsDto } from "../dto/update-settings.dto";

export class SettingsRepository {
  async findByTenant(tenantId: string): Promise<TenantSettings | null> {
    return prisma.tenantSettings.findUnique({
      where: { tenantId },
    });
  }

  async update(tenantId: string, payload: UpdateSettingsDto): Promise<TenantSettings> {
    return prisma.tenantSettings.update({
      where: { tenantId },
      data: {
        ...(payload.organizationName !== undefined
          ? { organizationName: payload.organizationName }
          : {}),
        ...(payload.taxId !== undefined ? { taxId: payload.taxId } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
        ...(payload.email !== undefined ? { email: payload.email } : {}),
        ...(payload.lowStockAlerts !== undefined
          ? { lowStockAlerts: payload.lowStockAlerts }
          : {}),
        ...(payload.expiryAlerts !== undefined
          ? { expiryAlerts: payload.expiryAlerts }
          : {}),
        ...(payload.purchaseOrderUpdates !== undefined
          ? { purchaseOrderUpdates: payload.purchaseOrderUpdates }
          : {}),
        ...(payload.receiptHeader !== undefined
          ? { receiptHeader: payload.receiptHeader }
          : {}),
        ...(payload.receiptFooter !== undefined
          ? { receiptFooter: payload.receiptFooter }
          : {}),
        ...(payload.vatPercentage !== undefined
          ? { vatPercentage: new Prisma.Decimal(payload.vatPercentage) }
          : {}),
        ...(payload.defaultLanguage !== undefined
          ? { defaultLanguage: payload.defaultLanguage }
          : {}),
      },
    });
  }
}

export const settingsRepository = new SettingsRepository();
