import { env } from "../../config/env";

export interface WelcomeUserTemplateData {
  fullName: string;
  email: string;
  password: string;
  lang: "en" | "ar";
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

const appName = env.APP_NAME;
const appUrl  = env.APP_URL;

// ── Shared styles ─────────────────────────────────────────────────────────────

const COLORS = {
  brand:      "#2563EB",   // blue-600
  brandDark:  "#1D4ED8",   // blue-700
  text:       "#1F2937",   // gray-800
  muted:      "#6B7280",   // gray-500
  bg:         "#F9FAFB",   // gray-50
  card:       "#FFFFFF",
  border:     "#E5E7EB",   // gray-200
  warning:    "#92400E",   // amber-800
  warningBg:  "#FEF3C7",   // amber-100
};

function layout(content: string, dir: "ltr" | "rtl"): string {
  return `<!DOCTYPE html>
<html lang="${dir === "rtl" ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <title>${appName}</title>
  <style>
    body, html { margin:0; padding:0; background:${COLORS.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .email-wrapper { background:${COLORS.bg}; padding:32px 16px; }
    .email-card { max-width:580px; margin:0 auto; background:${COLORS.card}; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.1); }
    .email-header { background:${COLORS.brand}; padding:28px 32px; text-align:${dir === "rtl" ? "right" : "left"}; }
    .email-header h1 { margin:0; color:#fff; font-size:22px; font-weight:700; letter-spacing:-.3px; }
    .email-header p  { margin:4px 0 0; color:rgba(255,255,255,.8); font-size:14px; }
    .email-body { padding:32px; direction:${dir}; text-align:${dir === "rtl" ? "right" : "left"}; }
    .email-body h2 { margin:0 0 8px; color:${COLORS.text}; font-size:18px; }
    .email-body p  { margin:0 0 20px; color:${COLORS.text}; font-size:15px; line-height:1.6; }
    .credential-box { background:${COLORS.bg}; border:1px solid ${COLORS.border}; border-radius:8px; padding:20px 24px; margin:20px 0; }
    .credential-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid ${COLORS.border}; direction:ltr; }
    .credential-row:last-child { border-bottom:none; padding-bottom:0; }
    .credential-label { font-size:13px; color:${COLORS.muted}; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
    .credential-value { font-size:15px; color:${COLORS.text}; font-weight:600; font-family:monospace; word-break:break-all; }
    .warning-box { background:${COLORS.warningBg}; border-radius:8px; padding:14px 18px; margin:20px 0; color:${COLORS.warning}; font-size:14px; line-height:1.5; direction:${dir}; text-align:${dir === "rtl" ? "right" : "left"}; }
    .cta-btn { display:inline-block; background:${COLORS.brand}; color:#fff !important; text-decoration:none; padding:13px 28px; border-radius:8px; font-size:15px; font-weight:600; margin:8px 0 24px; }
    .cta-btn:hover { background:${COLORS.brandDark}; }
    .email-footer { border-top:1px solid ${COLORS.border}; padding:20px 32px; text-align:center; }
    .email-footer p { margin:0; font-size:12px; color:${COLORS.muted}; line-height:1.6; }
    @media (max-width:600px) {
      .email-body, .email-header { padding:20px; }
      .email-footer { padding:16px 20px; }
      .credential-row { flex-direction:column; align-items:flex-start; gap:4px; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-card">
      ${content}
    </div>
  </div>
</body>
</html>`;
}

// ── English template ──────────────────────────────────────────────────────────

function buildEn(data: WelcomeUserTemplateData): EmailTemplate {
  const subject = `Welcome to ${appName} — Your account is ready`;

  const html = layout(`
    <div class="email-header">
      <h1>${appName}</h1>
      <p>Pharmacy Management Platform</p>
    </div>
    <div class="email-body">
      <h2>Welcome, ${data.fullName}! 👋</h2>
      <p>
        Your account has been created successfully. Use the credentials below
        to sign in to the platform and get started.
      </p>

      <div class="credential-box">
        <div class="credential-row">
          <span class="credential-label">Email</span>
          <span class="credential-value">${data.email}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Password</span>
          <span class="credential-value">${data.password}</span>
        </div>
      </div>

      <div class="warning-box">
        ⚠️ <strong>Important:</strong> Please change your password immediately
        after your first login. Do not share these credentials with anyone.
      </div>

      <a href="${appUrl}" class="cta-btn">Sign in to ${appName}</a>

      <p style="font-size:13px; color:#6B7280;">
        If you did not expect this email, please contact your pharmacy
        administrator immediately.
      </p>
    </div>
    <div class="email-footer">
      <p>This is an automated message from <strong>${appName}</strong>.<br />
      Please do not reply directly to this email.</p>
      <p style="margin-top:8px;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  `, "ltr");

  return { subject, html };
}

// ── Arabic template ───────────────────────────────────────────────────────────

function buildAr(data: WelcomeUserTemplateData): EmailTemplate {
  const subject = `مرحباً بك في ${appName} — حسابك جاهز الآن`;

  const html = layout(`
    <div class="email-header">
      <h1>${appName}</h1>
      <p>منصة إدارة الصيدليات</p>
    </div>
    <div class="email-body">
      <h2>أهلاً وسهلاً، ${data.fullName}! 👋</h2>
      <p>
        تم إنشاء حسابك بنجاح. استخدم بيانات الاعتماد أدناه
        لتسجيل الدخول إلى المنصة والبدء في العمل.
      </p>

      <div class="credential-box">
        <div class="credential-row">
          <span class="credential-label">البريد الإلكتروني</span>
          <span class="credential-value">${data.email}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">كلمة المرور</span>
          <span class="credential-value">${data.password}</span>
        </div>
      </div>

      <div class="warning-box">
        ⚠️ <strong>تنبيه مهم:</strong> يُرجى تغيير كلمة المرور فور تسجيل دخولك
        لأول مرة. لا تشارك هذه البيانات مع أي شخص آخر.
      </div>

      <a href="${appUrl}" class="cta-btn">تسجيل الدخول إلى ${appName}</a>

      <p style="font-size:13px; color:#6B7280;">
        إذا لم تكن تتوقع هذا البريد الإلكتروني، يُرجى التواصل مع
        مدير الصيدلية فوراً.
      </p>
    </div>
    <div class="email-footer">
      <p>هذه رسالة آلية من <strong>${appName}</strong>.<br />
      يُرجى عدم الرد مباشرةً على هذا البريد.</p>
      <p style="margin-top:8px;">&copy; ${new Date().getFullYear()} ${appName}. جميع الحقوق محفوظة.</p>
    </div>
  `, "rtl");

  return { subject, html };
}

// ── Public builder ────────────────────────────────────────────────────────────

export function buildWelcomeUserEmail(data: WelcomeUserTemplateData): EmailTemplate {
  return data.lang === "ar" ? buildAr(data) : buildEn(data);
}
