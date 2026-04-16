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
import arAdmin from "./locales/ar/admin.json";
import arAuth from "./locales/ar/auth.json";
import arCommon from "./locales/ar/common.json";
import arPlan from "./locales/ar/plan.json";
import arSubscription from "./locales/ar/subscription.json";
import arTenant from "./locales/ar/tenant.json";
import arUser from "./locales/ar/user.json";
import arBranch from "./locales/ar/branch.json";

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
