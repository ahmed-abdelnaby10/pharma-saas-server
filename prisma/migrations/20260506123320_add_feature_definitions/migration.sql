-- CreateTable
CREATE TABLE "feature_definitions" (
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "requiresKeys" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_definitions_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "feature_definitions_module_idx" ON "feature_definitions"("module");

-- CreateIndex
CREATE INDEX "feature_definitions_isActive_idx" ON "feature_definitions"("isActive");

-- Seed all registry entries BEFORE adding the FK constraints.
-- This ensures existing PlanFeature / TenantFeatureOverride rows are never
-- blocked by the constraint during migration.
INSERT INTO "feature_definitions" ("key","type","labelEn","labelAr","descriptionEn","descriptionAr","module","requiresKeys","isActive","updatedAt")
VALUES
  ('ocr.invoices',        'boolean','Invoice OCR','التعرف الضوئي على الفواتير','Scan and auto-extract invoice data using Gemini Vision','مسح الفواتير واستخراج بياناتها تلقائياً باستخدام Gemini Vision','ocr','{}',true,NOW()),
  ('ocr.prescriptions',   'boolean','Prescription OCR','التعرف الضوئي على الوصفات','Scan and auto-extract prescription data using Gemini Vision','مسح الوصفات الطبية واستخراج بياناتها تلقائياً باستخدام Gemini Vision','ocr','{}',true,NOW()),
  ('ocr.monthly_pages',   'limit','OCR Pages / Month','صفحات التعرف الضوئي في الشهر','Maximum OCR-processed pages per calendar month. 0 = unlimited.','الحد الأقصى لصفحات التعرف الضوئي شهرياً. 0 = غير محدود.','ocr','{}',true,NOW()),
  ('reports.basic',        'boolean','Basic Reports','التقارير الأساسية','Sales summaries, inventory snapshots, and daily totals','ملخصات المبيعات ولقطات المخزون والإجماليات اليومية','reports','{}',true,NOW()),
  ('reports.advanced',     'boolean','Advanced Reports','التقارير المتقدمة','Trend analysis, forecasting, and multi-branch analytics','تحليل الاتجاهات والتنبؤ وتحليلات متعددة الفروع','reports',ARRAY['reports.basic'],true,NOW()),
  ('reports.export',       'boolean','Report Export (PDF / Excel)','تصدير التقارير (PDF / Excel)','Export any report to PDF or Excel format','تصدير أي تقرير إلى صيغة PDF أو Excel','reports',ARRAY['reports.basic'],true,NOW()),
  ('branches.max',         'limit','Max Branches','الحد الأقصى للفروع','Maximum number of branches the tenant can create. 0 = unlimited.','الحد الأقصى لعدد الفروع التي يمكن للمستأجر إنشاؤها. 0 = غير محدود.','branches','{}',true,NOW()),
  ('users.max',            'limit','Max Users','الحد الأقصى للمستخدمين','Maximum number of tenant users across all branches. 0 = unlimited.','الحد الأقصى لعدد مستخدمي المستأجر في جميع الفروع. 0 = غير محدود.','users','{}',true,NOW()),
  ('catalog.products_max', 'limit','Max Products in Catalog','الحد الأقصى للمنتجات في الكتالوج','Maximum number of products in the local catalog. 0 = unlimited.','الحد الأقصى لعدد المنتجات في الكتالوج المحلي. 0 = غير محدود.','catalog','{}',true,NOW()),
  ('catalog.global_access','boolean','Global Medicine Catalog','كتالوج الأدوية العالمي','Access to the shared global medicine catalog for quick import','الوصول إلى كتالوج الأدوية العالمي المشترك للاستيراد السريع','catalog','{}',true,NOW()),
  ('pos.access',           'boolean','Point of Sale','نقطة البيع','Access to the POS module for processing sales transactions','الوصول إلى وحدة نقطة البيع لمعالجة معاملات المبيعات','pos','{}',true,NOW()),
  ('shifts.access',        'boolean','Shift Management','إدارة الوردية','Open and close cashier shifts and track per-shift summaries','فتح وإغلاق أوردية أمناء الصندوق وتتبع ملخصات كل وردية','shifts','{}',true,NOW()),
  ('purchasing.access',    'boolean','Purchasing & Purchase Orders','المشتريات وأوامر الشراء','Raise purchase orders, receive stock, and manage suppliers','رفع أوامر الشراء واستلام المخزون وإدارة الموردين','purchasing','{}',true,NOW()),
  ('patients.access',      'boolean','Patient Management','إدارة المرضى','Maintain patient records and prescription history','الاحتفاظ بسجلات المرضى وتاريخ الوصفات الطبية','patients','{}',true,NOW()),
  ('storage.mb',           'limit','Storage Quota (MB)','حصة التخزين (ميجابايت)','Total file upload storage quota in megabytes. 0 = unlimited.','الحصة الإجمالية لتخزين الملفات بالميجابايت. 0 = غير محدود.','ocr','{}',true,NOW()),
  ('notifications.email',  'boolean','Email Notifications','إشعارات البريد الإلكتروني','Send system notifications via email','إرسال إشعارات النظام عبر البريد الإلكتروني','notifications','{}',true,NOW()),
  ('notifications.sms',    'boolean','SMS Notifications','إشعارات الرسائل القصيرة','Send system notifications via SMS','إرسال إشعارات النظام عبر الرسائل القصيرة','notifications','{}',true,NOW()),
  ('api.access',           'boolean','API Access','الوصول إلى API','Generate API keys for third-party integrations','إنشاء مفاتيح API لتكاملات الطرف الثالث','api','{}',true,NOW()),
  ('api.requests_per_day', 'limit','API Requests / Day','طلبات API في اليوم','Maximum API requests allowed per day. 0 = unlimited.','الحد الأقصى لطلبات API المسموح بها يومياً. 0 = غير محدود.','api',ARRAY['api.access'],true,NOW()),
  ('audit.access',         'boolean','Audit Log Access','الوصول إلى سجل التدقيق','Tenant admins can view their own activity audit trail','يمكن لمسؤولي المستأجر عرض سجل نشاطهم الخاص','audit','{}',true,NOW()),
  ('inventory.batches',    'boolean','Inventory Batch Tracking','تتبع دفعات المخزون','Track batches, lot numbers, and expiry dates per inventory item','تتبع الدفعات وأرقام الأوراق وتواريخ انتهاء الصلاحية لكل عنصر مخزون','inventory','{}',true,NOW()),
  ('inventory.alerts',     'boolean','Inventory Alerts','تنبيهات المخزون','Automated low-stock and expiry date alerts','تنبيهات آلية لانخفاض المخزون وانتهاء تواريخ الصلاحية','inventory',ARRAY['inventory.batches'],true,NOW())
ON CONFLICT ("key") DO UPDATE SET
  "labelEn"       = EXCLUDED."labelEn",
  "labelAr"       = EXCLUDED."labelAr",
  "descriptionEn" = EXCLUDED."descriptionEn",
  "descriptionAr" = EXCLUDED."descriptionAr",
  "module"        = EXCLUDED."module",
  "requiresKeys"  = EXCLUDED."requiresKeys",
  "isActive"      = EXCLUDED."isActive",
  "updatedAt"     = NOW();

-- AddForeignKey (safe now — all valid keys exist in feature_definitions)
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "feature_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantFeatureOverride" ADD CONSTRAINT "TenantFeatureOverride_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "feature_definitions"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
