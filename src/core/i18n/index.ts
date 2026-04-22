import { appConfig } from "../config/app.config";
import {
  Language,
  supportedLanguages,
  TranslationParams,
  Translator,
} from "../../shared/types/locale.types";
import enAdmin from "./locales/en/admin.json";
import enAuth from "./locales/en/auth.json";
import enCommon from "./locales/en/common.json";
import enPlan from "./locales/en/plan.json";
import enSubscription from "./locales/en/subscription.json";
import enTenant from "./locales/en/tenant.json";
import enUser from "./locales/en/user.json";
import enBranch from "./locales/en/branch.json";
import enRole from "./locales/en/role.json";
import enSettings from "./locales/en/settings.json";
import enCatalog from "./locales/en/catalog.json";
import enSupplier from "./locales/en/supplier.json";
import enInventoryItem from "./locales/en/inventory-item.json";
import enInventoryBatch from "./locales/en/inventory-batch.json";
import enStockMovement from "./locales/en/stock-movement.json";
import enPurchaseOrder from "./locales/en/purchase-order.json";
import enShift from "./locales/en/shift.json";
import enSale from "./locales/en/sale.json";
import enAlert from "./locales/en/alert.json";
import enReport from "./locales/en/report.json";
import enDashboard from "./locales/en/dashboard.json";
import enAnalytics from "./locales/en/analytics.json";
import enOcr from "./locales/en/ocr.json";
import enInvoice from "./locales/en/invoice.json";
import arAdmin from "./locales/ar/admin.json";
import arAuth from "./locales/ar/auth.json";
import arCommon from "./locales/ar/common.json";
import arPlan from "./locales/ar/plan.json";
import arSubscription from "./locales/ar/subscription.json";
import arTenant from "./locales/ar/tenant.json";
import arUser from "./locales/ar/user.json";
import arBranch from "./locales/ar/branch.json";
import arRole from "./locales/ar/role.json";
import arSettings from "./locales/ar/settings.json";
import arCatalog from "./locales/ar/catalog.json";
import arSupplier from "./locales/ar/supplier.json";
import arInventoryItem from "./locales/ar/inventory-item.json";
import arInventoryBatch from "./locales/ar/inventory-batch.json";
import arStockMovement from "./locales/ar/stock-movement.json";
import arPurchaseOrder from "./locales/ar/purchase-order.json";
import arShift from "./locales/ar/shift.json";
import arSale from "./locales/ar/sale.json";
import arAlert from "./locales/ar/alert.json";
import arReport from "./locales/ar/report.json";
import arDashboard from "./locales/ar/dashboard.json";
import arAnalytics from "./locales/ar/analytics.json";
import arOcr from "./locales/ar/ocr.json";
import arInvoice from "./locales/ar/invoice.json";

type TranslationCatalog = Record<string, string>;

const translations: Record<Language, TranslationCatalog> = {
  en: {
    ...enCommon,
    ...enAuth,
    ...enTenant,
    ...enSubscription,
    ...enPlan,
    ...enAdmin,
    ...enUser,
    ...enBranch,
    ...enRole,
    ...enSettings,
    ...enCatalog,
    ...enSupplier,
    ...enInventoryItem,
    ...enInventoryBatch,
    ...enStockMovement,
    ...enPurchaseOrder,
    ...enShift,
    ...enSale,
    ...enAlert,
    ...enReport,
    ...enDashboard,
    ...enAnalytics,
    ...enOcr,
    ...enInvoice,
  },
  ar: {
    ...arCommon,
    ...arAuth,
    ...arTenant,
    ...arSubscription,
    ...arPlan,
    ...arAdmin,
    ...arUser,
    ...arBranch,
    ...arRole,
    ...arSettings,
    ...arCatalog,
    ...arSupplier,
    ...arInventoryItem,
    ...arInventoryBatch,
    ...arStockMovement,
    ...arPurchaseOrder,
    ...arShift,
    ...arSale,
    ...arAlert,
    ...arReport,
    ...arDashboard,
    ...arAnalytics,
    ...arOcr,
    ...arInvoice,
  },
};

const normalizeLanguage = (value?: string): Language | undefined => {
  if (!value) {
    return undefined;
  }

  const baseLanguage = value.split(";")[0]?.trim().split("-")[0]?.toLowerCase();

  return supportedLanguages.find((language) => language === baseLanguage);
};

export const resolveLanguage = (
  acceptLanguageHeader?: string,
  fallbackLanguage: Language = appConfig.defaultLanguage,
): Language => {
  const requestedLanguages = acceptLanguageHeader?.split(",") ?? [];

  for (const entry of requestedLanguages) {
    const language = normalizeLanguage(entry);

    if (language) {
      return language;
    }
  }

  return fallbackLanguage;
};

export const translate = (
  lang: Language,
  key: string,
  params?: TranslationParams,
): string => {
  const locale = translations[lang] ?? translations[appConfig.defaultLanguage];
  const value = locale[key] ?? translations.en[key] ?? key;

  if (!params) {
    return value;
  }

  return Object.entries(params).reduce((message, [paramKey, paramValue]) => {
    return message.replace(
      new RegExp(`{{${paramKey}}}`, "g"),
      String(paramValue),
    );
  }, value);
};

export const createTranslator = (lang: Language): Translator => {
  return (key, params) => translate(lang, key, params);
};
