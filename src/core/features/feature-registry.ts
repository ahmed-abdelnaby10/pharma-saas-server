/**
 * Single source of truth for every feature key that exists in the application.
 *
 * Rules:
 * - NEVER remove a key — set isActive = false in the seed to soft-disable it.
 * - Adding a new key requires re-running the seed-feature-definitions script.
 * - Keys are dot-separated: "<module>.<feature>".
 * - type "boolean"  → enabled/disabled flag; limitValue must not be set.
 * - type "limit"    → numeric cap; limitValue is required (0 = unlimited).
 */

export const FEATURE_KEYS = {
  // ── OCR ───────────────────────────────────────────────────────────────────
  OCR_INVOICES:         "ocr.invoices",
  OCR_PRESCRIPTIONS:    "ocr.prescriptions",
  OCR_MONTHLY_PAGES:    "ocr.monthly_pages",

  // ── Reports ───────────────────────────────────────────────────────────────
  REPORTS_BASIC:        "reports.basic",
  REPORTS_ADVANCED:     "reports.advanced",
  REPORTS_EXPORT:       "reports.export",

  // ── Branches & Users ──────────────────────────────────────────────────────
  BRANCHES_MAX:         "branches.max",
  USERS_MAX:            "users.max",

  // ── Catalog ───────────────────────────────────────────────────────────────
  CATALOG_MEDICINES:     "catalog.medicines",
  CATALOG_PRODUCTS_MAX:  "catalog.products_max",
  CATALOG_GLOBAL_ACCESS: "catalog.global_access",

  // ── POS & Sales ───────────────────────────────────────────────────────────
  POS_ACCESS:           "pos.access",
  SHIFTS_ACCESS:        "shifts.access",

  // ── Purchasing ────────────────────────────────────────────────────────────
  PURCHASING_ACCESS:    "purchasing.access",

  // ── Patients ──────────────────────────────────────────────────────────────
  PATIENTS_ACCESS:      "patients.access",

  // ── Storage ───────────────────────────────────────────────────────────────
  STORAGE_MB:           "storage.mb",

  // ── Notifications ─────────────────────────────────────────────────────────
  NOTIFICATIONS_EMAIL:  "notifications.email",
  NOTIFICATIONS_SMS:    "notifications.sms",

  // ── API ───────────────────────────────────────────────────────────────────
  API_ACCESS:           "api.access",
  API_REQUESTS_DAY:     "api.requests_per_day",

  // ── Audit ─────────────────────────────────────────────────────────────────
  AUDIT_ACCESS:         "audit.access",

  // ── Inventory ─────────────────────────────────────────────────────────────
  INVENTORY_BATCHES:    "inventory.batches",
  INVENTORY_ALERTS:     "inventory.alerts",
} as const;

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];

/** Set of all valid keys — used for O(1) validation at write time. */
export const VALID_FEATURE_KEYS = new Set<string>(Object.values(FEATURE_KEYS));

export interface FeatureMeta {
  key:            FeatureKey;
  type:           "boolean" | "limit";
  labelEn:        string;
  labelAr:        string;
  descriptionEn:  string;
  descriptionAr:  string;
  module:         string;
  /** Keys that MUST also be enabled when this key is enabled. */
  requiresKeys:   FeatureKey[];
  isActive:       boolean;
}

export const FEATURE_REGISTRY: FeatureMeta[] = [
  // ── OCR ──────────────────────────────────────────────────────────────────
  {
    key: FEATURE_KEYS.OCR_INVOICES,
    type: "boolean",
    labelEn: "Invoice OCR",
    labelAr: "التعرف الضوئي على الفواتير",
    descriptionEn: "Scan and auto-extract invoice data using Gemini Vision",
    descriptionAr: "مسح الفواتير واستخراج بياناتها تلقائياً باستخدام Gemini Vision",
    module: "ocr",
    requiresKeys: [],
    isActive: true,
  },
  {
    key: FEATURE_KEYS.OCR_PRESCRIPTIONS,
    type: "boolean",
    labelEn: "Prescription OCR",
    labelAr: "التعرف الضوئي على الوصفات",
    descriptionEn: "Scan and auto-extract prescription data using Gemini Vision",
    descriptionAr: "مسح الوصفات الطبية واستخراج بياناتها تلقائياً باستخدام Gemini Vision",
    module: "ocr",
    requiresKeys: [],
    isActive: true,
  },
  {
    key: FEATURE_KEYS.OCR_MONTHLY_PAGES,
    type: "limit",
    labelEn: "OCR Pages / Month",
    labelAr: "صفحات التعرف الضوئي في الشهر",
    descriptionEn: "Maximum OCR-processed pages per calendar month. 0 = unlimited.",
    descriptionAr: "الحد الأقصى لصفحات التعرف الضوئي شهرياً. 0 = غير محدود.",
    module: "ocr",
    requiresKeys: [],
    isActive: true,
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  {
    key: FEATURE_KEYS.REPORTS_BASIC,
    type: "boolean",
    labelEn: "Basic Reports",
    labelAr: "التقارير الأساسية",
    descriptionEn: "Sales summaries, inventory snapshots, and daily totals",
    descriptionAr: "ملخصات المبيعات ولقطات المخزون والإجماليات اليومية",
    module: "reports",
    requiresKeys: [],
    isActive: true,
  },
  {
    key: FEATURE_KEYS.REPORTS_ADVANCED,
    type: "boolean",
    labelEn: "Advanced Reports",
    labelAr: "التقارير المتقدمة",
    descriptionEn: "Trend analysis, forecasting, and multi-branch analytics",
    descriptionAr: "تحليل الاتجاهات والتنبؤ وتحليلات متعددة الفروع",
    module: "reports",
    requiresKeys: [FEATURE_KEYS.REPORTS_BASIC],
    isActive: true,
  },
  {
    key: FEATURE_KEYS.REPORTS_EXPORT,
    type: "boolean",
    labelEn: "Report Export (PDF / Excel)",
    labelAr: "تصدير التقارير (PDF / Excel)",
    descriptionEn: "Export any report to PDF or Excel format",
    descriptionAr: "تصدير أي تقرير إلى صيغة PDF أو Excel",
    module: "reports",
    requiresKeys: [FEATURE_KEYS.REPORTS_BASIC],
    isActive: true,
  },

  // ── Branches & Users ──────────────────────────────────────────────────────
  {
    key: FEATURE_KEYS.BRANCHES_MAX,
    type: "limit",
    labelEn: "Max Branches",
    labelAr: "الحد الأقصى للفروع",
    descriptionEn: "Maximum number of branches the tenant can create. 0 = unlimited.",
    descriptionAr: "الحد الأقصى لعدد الفروع التي يمكن للمستأجر إنشاؤها. 0 = غير محدود.",
    module: "branches",
    requiresKeys: [],
    isActive: true,
  },
  {
    key: FEATURE_KEYS.USERS_MAX,
    type: "limit",
    labelEn: "Max Users",
    labelAr: "الحد الأقصى للمستخدمين",
    descriptionEn: "Maximum number of tenant users across all branches. 0 = unlimited.",
    descriptionAr: "الحد الأقصى لعدد مستخدمي المستأجر في جميع الفروع. 0 = غير محدود.",
    module: "users",
    requiresKeys: [],
    isActive: true,
  },

  // ── Catalog ───────────────────────────────────────────────────────────────
  {
    key: FEATURE_KEYS.CATALOG_MEDICINES,
    type: "boolean",
    labelEn: "Medicine Catalog",
    labelAr: "كتالوج الأدوية",
    descriptionEn: "Access to medicine catalog features",
    descriptionAr: "الوصول إلى خصائص كتالوج الأدوية",
    module: "catalog",
    requiresKeys: [],
    isActive: true,
  },
  {
    key: FEATURE_KEYS.CATALOG_PRODUCTS_MAX,
    type: "limit",
    labelEn: "Max Products in Catalog",
    labelAr: "الحد الأقصى للمنتجات في الكتالوج",
    descriptionEn: "Maximum number of products in the local catalog. 0 = unlimited.",
    descriptionAr: "الحد الأقصى لعدد المنتجات في الكتالوج المحلي. 0 = غير محدود.",
    module: "catalog",
    requiresKeys: [],
    isActive: true,
  },
  {
    key: FEATURE_KEYS.CATALOG_GLOBAL_ACCESS,
    type: "boolean",
    labelEn: "Global Medicine Catalog",
    labelAr: "كتالوج الأدوية العالمي",
    descriptionEn: "Access to the shared global medicine catalog for quick import",
    descriptionAr: "الوصول إلى كتالوج الأدوية العالمي المشترك للاستيراد السريع",
    module: "catalog",
    requiresKeys: [],
    isActive: true,
  },

  // ── POS & Sales ───────────────────────────────────────────────────────────
  {
    key: FEATURE_KEYS.POS_ACCESS,
    type: "boolean",
    labelEn: "Point of Sale",
    labelAr: "نقطة البيع",
    descriptionEn: "Access to the POS module for processing sales transactions",
    descriptionAr: "الوصول إلى وحدة نقطة البيع لمعالجة معاملات المبيعات",
    module: "pos",
    requiresKeys: [],
    isActive: true,
  },
  {
    key: FEATURE_KEYS.SHIFTS_ACCESS,
    type: "boolean",
    labelEn: "Shift Management",
    labelAr: "إدارة الوردية",
    descriptionEn: "Open and close cashier shifts and track per-shift summaries",
    descriptionAr: "فتح وإغلاق أوردية أمناء الصندوق وتتبع ملخصات كل وردية",
    module: "shifts",
    requiresKeys: [],
    isActive: true,
  },

  // ── Purchasing ────────────────────────────────────────────────────────────
  {
    key: FEATURE_KEYS.PURCHASING_ACCESS,
    type: "boolean",
    labelEn: "Purchasing & Purchase Orders",
    labelAr: "المشتريات وأوامر الشراء",
    descriptionEn: "Raise purchase orders, receive stock, and manage suppliers",
    descriptionAr: "رفع أوامر الشراء واستلام المخزون وإدارة الموردين",
    module: "purchasing",
    requiresKeys: [],
    isActive: true,
  },

  // ── Patients ──────────────────────────────────────────────────────────────
  {
    key: FEATURE_KEYS.PATIENTS_ACCESS,
    type: "boolean",
    labelEn: "Patient Management",
    labelAr: "إدارة المرضى",
    descriptionEn: "Maintain patient records and prescription history",
    descriptionAr: "الاحتفاظ بسجلات المرضى وتاريخ الوصفات الطبية",
    module: "patients",
    requiresKeys: [],
    isActive: true,
  },

  // ── Storage ───────────────────────────────────────────────────────────────
  {
    key: FEATURE_KEYS.STORAGE_MB,
    type: "limit",
    labelEn: "Storage Quota (MB)",
    labelAr: "حصة التخزين (ميجابايت)",
    descriptionEn: "Total file upload storage quota in megabytes. 0 = unlimited.",
    descriptionAr: "الحصة الإجمالية لتخزين الملفات بالميجابايت. 0 = غير محدود.",
    module: "ocr",
    requiresKeys: [],
    isActive: true,
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  {
    key: FEATURE_KEYS.NOTIFICATIONS_EMAIL,
    type: "boolean",
    labelEn: "Email Notifications",
    labelAr: "إشعارات البريد الإلكتروني",
    descriptionEn: "Send system notifications via email",
    descriptionAr: "إرسال إشعارات النظام عبر البريد الإلكتروني",
    module: "notifications",
    requiresKeys: [],
    isActive: true,
  },
  {
    key: FEATURE_KEYS.NOTIFICATIONS_SMS,
    type: "boolean",
    labelEn: "SMS Notifications",
    labelAr: "إشعارات الرسائل القصيرة",
    descriptionEn: "Send system notifications via SMS",
    descriptionAr: "إرسال إشعارات النظام عبر الرسائل القصيرة",
    module: "notifications",
    requiresKeys: [],
    isActive: true,
  },

  // ── API ───────────────────────────────────────────────────────────────────
  {
    key: FEATURE_KEYS.API_ACCESS,
    type: "boolean",
    labelEn: "API Access",
    labelAr: "الوصول إلى API",
    descriptionEn: "Generate API keys for third-party integrations",
    descriptionAr: "إنشاء مفاتيح API لتكاملات الطرف الثالث",
    module: "api",
    requiresKeys: [],
    isActive: true,
  },
  {
    key: FEATURE_KEYS.API_REQUESTS_DAY,
    type: "limit",
    labelEn: "API Requests / Day",
    labelAr: "طلبات API في اليوم",
    descriptionEn: "Maximum API requests allowed per day. 0 = unlimited.",
    descriptionAr: "الحد الأقصى لطلبات API المسموح بها يومياً. 0 = غير محدود.",
    module: "api",
    requiresKeys: [FEATURE_KEYS.API_ACCESS],
    isActive: true,
  },

  // ── Audit ─────────────────────────────────────────────────────────────────
  {
    key: FEATURE_KEYS.AUDIT_ACCESS,
    type: "boolean",
    labelEn: "Audit Log Access",
    labelAr: "الوصول إلى سجل التدقيق",
    descriptionEn: "Tenant admins can view their own activity audit trail",
    descriptionAr: "يمكن لمسؤولي المستأجر عرض سجل نشاطهم الخاص",
    module: "audit",
    requiresKeys: [],
    isActive: true,
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  {
    key: FEATURE_KEYS.INVENTORY_BATCHES,
    type: "boolean",
    labelEn: "Inventory Batch Tracking",
    labelAr: "تتبع دفعات المخزون",
    descriptionEn: "Track batches, lot numbers, and expiry dates per inventory item",
    descriptionAr: "تتبع الدفعات وأرقام الأوراق وتواريخ انتهاء الصلاحية لكل عنصر مخزون",
    module: "inventory",
    requiresKeys: [],
    isActive: true,
  },
  {
    key: FEATURE_KEYS.INVENTORY_ALERTS,
    type: "boolean",
    labelEn: "Inventory Alerts",
    labelAr: "تنبيهات المخزون",
    descriptionEn: "Automated low-stock and expiry date alerts",
    descriptionAr: "تنبيهات آلية لانخفاض المخزون وانتهاء تواريخ الصلاحية",
    module: "inventory",
    requiresKeys: [FEATURE_KEYS.INVENTORY_BATCHES],
    isActive: true,
  },
];
