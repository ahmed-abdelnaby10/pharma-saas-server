import { PreferredLanguage } from "@prisma/client";

export type UpdateSettingsDto = {
  /** Pharmacy display names — updates the Tenant record directly */
  nameEn?: string;
  nameAr?: string;
  organizationName?: string | null;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  lowStockAlerts?: boolean;
  lowStockThresholdDays?: number;
  expiryAlerts?: boolean;
  expiryAlertWindowDays?: number;
  purchaseOrderUpdates?: boolean;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  vatPercentage?: number;
  defaultLanguage?: PreferredLanguage;
};
