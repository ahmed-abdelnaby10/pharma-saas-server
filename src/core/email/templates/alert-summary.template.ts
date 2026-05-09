import * as fs from "fs";
import * as path from "path";

function loadLogoDataUri(): string | null {
  try {
    const logoPath = path.join(process.cwd(), "src", "assets", "yomdix-app-icon.webp");
    const buffer = fs.readFileSync(logoPath);
    return `data:image/webp;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

const logoDataUri = loadLogoDataUri();
const logoImg = logoDataUri
  ? `<img src="${logoDataUri}" alt="Yomdix" width="40" height="40"
       style="border-radius:8px;display:block;margin-bottom:10px;" />`
  : "";

interface LowStockItem {
  catalogNameEn: string;
  catalogNameAr: string;
  quantityOnHand: string;
  reorderLevel: string;
}

interface ExpiryItem {
  catalogNameEn: string;
  catalogNameAr: string;
  batchNumber: string;
  daysUntilExpiry: number;
  quantityOnHand: string;
}

interface AlertSummaryEmailOptions {
  pharmacyNameEn: string;
  pharmacyNameAr: string;
  lowStockItems: LowStockItem[];
  expiryItems: ExpiryItem[];
  lang: "en" | "ar";
}

export function buildAlertSummaryEmail(opts: AlertSummaryEmailOptions): {
  subject: string;
  html: string;
} {
  const isAr = opts.lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const pharmacyName = isAr ? opts.pharmacyNameAr : opts.pharmacyNameEn;

  const subject = isAr
    ? `تنبيه مخزون | ${pharmacyName}`
    : `Inventory Alert | ${pharmacyName}`;

  // ── Low-stock rows ─────────────────────────────────────────────────────────
  const lowStockRows = opts.lowStockItems.map((item) => {
    const name = isAr ? item.catalogNameAr : item.catalogNameEn;
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#e53e3e;font-weight:600;">${item.quantityOnHand}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#718096;">${item.reorderLevel}</td>
      </tr>`;
  }).join("");

  const lowStockSection = opts.lowStockItems.length === 0 ? "" : `
    <h3 style="margin:28px 0 12px;color:#c53030;font-size:15px;">
      ${isAr ? "⚠️ مخزون منخفض" : "⚠️ Low Stock Items"}
    </h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#fff5f5;">
          <th style="padding:10px 12px;text-align:${isAr ? "right" : "left"};color:#c53030;font-weight:600;">${isAr ? "الصنف" : "Item"}</th>
          <th style="padding:10px 12px;text-align:center;color:#c53030;font-weight:600;">${isAr ? "الكمية الحالية" : "Qty on Hand"}</th>
          <th style="padding:10px 12px;text-align:center;color:#c53030;font-weight:600;">${isAr ? "حد إعادة الطلب" : "Reorder Level"}</th>
        </tr>
      </thead>
      <tbody>${lowStockRows}</tbody>
    </table>`;

  // ── Expiry rows ────────────────────────────────────────────────────────────
  const expiryRows = opts.expiryItems.map((item) => {
    const name = isAr ? item.catalogNameAr : item.catalogNameEn;
    const urgencyColor = item.daysUntilExpiry <= 0 ? "#c53030" : item.daysUntilExpiry <= 7 ? "#dd6b20" : "#d69e2e";
    const urgencyLabel = item.daysUntilExpiry <= 0
      ? (isAr ? "منتهي الصلاحية" : "EXPIRED")
      : isAr
        ? `${item.daysUntilExpiry} يوم`
        : `${item.daysUntilExpiry} day(s)`;
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#718096;">${item.batchNumber}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:600;color:${urgencyColor};">${urgencyLabel}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#718096;">${item.quantityOnHand}</td>
      </tr>`;
  }).join("");

  const expirySection = opts.expiryItems.length === 0 ? "" : `
    <h3 style="margin:28px 0 12px;color:#c05621;font-size:15px;">
      ${isAr ? "📅 أصناف قريبة الانتهاء أو منتهية" : "📅 Expiring / Expired Items"}
    </h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#fffaf0;">
          <th style="padding:10px 12px;text-align:${isAr ? "right" : "left"};color:#c05621;font-weight:600;">${isAr ? "الصنف" : "Item"}</th>
          <th style="padding:10px 12px;text-align:center;color:#c05621;font-weight:600;">${isAr ? "رقم الدفعة" : "Batch"}</th>
          <th style="padding:10px 12px;text-align:center;color:#c05621;font-weight:600;">${isAr ? "المتبقي" : "Remaining"}</th>
          <th style="padding:10px 12px;text-align:center;color:#c05621;font-weight:600;">${isAr ? "الكمية" : "Qty"}</th>
        </tr>
      </thead>
      <tbody>${expiryRows}</tbody>
    </table>`;

  const html = `<!DOCTYPE html>
<html lang="${opts.lang}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f7fafc;font-family:Arial,sans-serif;direction:${dir};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr><td style="background:#1a365d;padding:24px 32px;">
          ${logoImg}
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${pharmacyName}</p>
          <p style="margin:6px 0 0;color:#bee3f8;font-size:13px;">
            ${isAr ? "تقرير تنبيهات المخزون" : "Inventory Alert Report"}
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;color:#2d3748;">
          <p style="margin:0 0 8px;font-size:14px;color:#4a5568;">
            ${isAr
              ? "مرحباً، يلي ملخص تنبيهات المخزون الحالية التي تحتاج إلى مراجعة:"
              : "Hello, here is a summary of the current inventory alerts that require your attention:"}
          </p>
          ${lowStockSection}
          ${expirySection}
          <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;"/>
          <p style="margin:0;font-size:12px;color:#a0aec0;">
            ${isAr
              ? "تم إرسال هذا البريد تلقائياً من نظام إدارة الصيدلية. لا ترد على هذه الرسالة."
              : "This email was sent automatically by the pharmacy management system. Please do not reply."}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
