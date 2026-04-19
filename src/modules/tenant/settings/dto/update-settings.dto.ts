import { PreferredLanguage } from "@prisma/client";

export type UpdateSettingsDto = {
  organizationName?: string | null;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  lowStockAlerts?: boolean;
  expiryAlerts?: boolean;
  purchaseOrderUpdates?: boolean;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  vatPercentage?: number;
  defaultLanguage?: PreferredLanguage;
};
