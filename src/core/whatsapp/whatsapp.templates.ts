import { env } from "../config/env";

const appName = env.APP_NAME;
const appUrl  = env.APP_URL;

// ── Approval (tenant account approved) ───────────────────────────────────────

export interface ApprovalWhatsAppData {
  pharmacyName: string;
  fullName:     string;
  email:        string;
  lang:         "en" | "ar";
}

export function buildApprovalWhatsApp(data: ApprovalWhatsAppData): string {
  if (data.lang === "ar") {
    return [
      `🎉 مرحباً ${data.fullName}!`,
      ``,
      `تمت الموافقة على حساب صيدليتك في ${appName}.`,
      ``,
      `📋 بيانات الدخول:`,
      `• الصيدلية: ${data.pharmacyName}`,
      `• البريد الإلكتروني: ${data.email}`,
      `• كلمة المرور: كلمة المرور التي أنشأتها عند التسجيل`,
      ``,
      `🔗 تسجيل الدخول: ${appUrl}`,
      ``,
      `⚠️ يُرجى تغيير كلمة المرور فور تسجيل دخولك لأول مرة.`,
    ].join("\n");
  }

  return [
    `🎉 Welcome, ${data.fullName}!`,
    ``,
    `Your pharmacy account on ${appName} has been approved.`,
    ``,
    `📋 Login credentials:`,
    `• Pharmacy: ${data.pharmacyName}`,
    `• Email: ${data.email}`,
    `• Password: the password you set during sign-up`,
    ``,
    `🔗 Sign in at: ${appUrl}`,
    ``,
    `⚠️ Please change your password after your first login.`,
  ].join("\n");
}

// ── New user welcome (user created by tenant admin) ───────────────────────────

export interface WelcomeUserWhatsAppData {
  fullName:  string;
  email:     string;
  password:  string;
  lang:      "en" | "ar";
}

export function buildWelcomeUserWhatsApp(data: WelcomeUserWhatsAppData): string {
  if (data.lang === "ar") {
    return [
      `👋 مرحباً ${data.fullName}!`,
      ``,
      `تم إنشاء حسابك في ${appName}. إليك بيانات الدخول:`,
      ``,
      `• البريد الإلكتروني: ${data.email}`,
      `• كلمة المرور: ${data.password}`,
      ``,
      `🔗 تسجيل الدخول: ${appUrl}`,
      ``,
      `⚠️ يُرجى تغيير كلمة المرور فور تسجيل دخولك لأول مرة. لا تشارك هذه البيانات مع أي شخص.`,
    ].join("\n");
  }

  return [
    `👋 Welcome, ${data.fullName}!`,
    ``,
    `Your account on ${appName} has been created. Here are your credentials:`,
    ``,
    `• Email: ${data.email}`,
    `• Password: ${data.password}`,
    ``,
    `🔗 Sign in at: ${appUrl}`,
    ``,
    `⚠️ Please change your password immediately after your first login. Do not share these credentials.`,
  ].join("\n");
}

// ── Inventory alert summary ───────────────────────────────────────────────────

export interface AlertWhatsAppData {
  pharmacyName:    string;
  lowStockCount:   number;
  expiryCount:     number;
  lang:            "en" | "ar";
}

export function buildAlertWhatsApp(data: AlertWhatsAppData): string {
  if (data.lang === "ar") {
    const parts: string[] = [
      `⚠️ تنبيه مخزون | ${data.pharmacyName}`,
      ``,
    ];
    if (data.lowStockCount > 0) {
      parts.push(`📦 مخزون منخفض: ${data.lowStockCount} صنف`);
    }
    if (data.expiryCount > 0) {
      parts.push(`📅 أصناف قريبة الانتهاء أو منتهية: ${data.expiryCount} صنف`);
    }
    parts.push(``, `🔗 سجّل دخولك لعرض التفاصيل: ${appUrl}`);
    return parts.join("\n");
  }

  const parts: string[] = [
    `⚠️ Inventory Alert | ${data.pharmacyName}`,
    ``,
  ];
  if (data.lowStockCount > 0) {
    parts.push(`📦 Low stock: ${data.lowStockCount} item(s)`);
  }
  if (data.expiryCount > 0) {
    parts.push(`📅 Expiring / expired: ${data.expiryCount} item(s)`);
  }
  parts.push(``, `🔗 Login to review: ${appUrl}`);
  return parts.join("\n");
}
