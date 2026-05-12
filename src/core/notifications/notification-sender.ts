import { logger } from "../logger/logger";
import { sendEmail } from "../email/email.service";
import { buildWelcomeUserEmail } from "../email/templates/welcome-user.template";
import { sendWhatsApp, tenantHasWhatsApp } from "../whatsapp/whatsapp.service";
import { buildApprovalWhatsApp } from "../whatsapp/whatsapp.templates";

/**
 * Fire-and-forget notification dispatcher.
 *
 * All functions here swallow errors so notification failures never break the
 * main request flow.
 */

export interface ApprovalNotificationPayload {
  /** Applicant name — used in email / WhatsApp greeting */
  fullName: string;
  /** Applicant e-mail — will receive the welcome / approval email */
  email: string;
  /** Applicant phone with country code (e.g. "+966501234567") — used for WhatsApp */
  phone?: string | null;
  pharmacyNameEn: string;
  pharmacyNameAr: string;
  preferredLanguage: string;
  tenantId: string;
}

/**
 * Notify the applicant when a signup request is approved:
 *  1. Sends a welcome email with login URL
 *  2. Sends a WhatsApp message if the tenant's plan includes WhatsApp
 *     notifications AND the applicant provided a phone number
 *
 * Both dispatches are fire-and-forget — errors are logged, never rethrown.
 */
export function notifySignupApproval(
  payload: ApprovalNotificationPayload,
): void {
  const lang = (payload.preferredLanguage === "ar" ? "ar" : "en") as "en" | "ar";
  const pharmacyName = lang === "ar" ? payload.pharmacyNameAr : payload.pharmacyNameEn;

  // ── 1. Welcome email ───────────────────────────────────────────────────────
  Promise.resolve()
    .then(async () => {
      const { subject, html } = buildWelcomeUserEmail({
        fullName: payload.fullName,
        email:    payload.email,
        // The plain-text password is not available at approval time (it was
        // hashed before storage).  The email instructs the owner to use the
        // password they chose during sign-up.
        password: "(use your sign-up password)",
        lang,
      });
      await sendEmail({ to: payload.email, subject, html });
    })
    .catch((err: unknown) => {
      logger.error(
        "notification-sender: failed to dispatch tenant approval email",
        { error: err instanceof Error ? err.message : String(err), tenantId: payload.tenantId },
      );
    });

  // ── 2. WhatsApp (plan-gated, requires phone) ───────────────────────────────
  if (payload.phone) {
    Promise.resolve()
      .then(async () => {
        const allowed = await tenantHasWhatsApp(payload.tenantId);
        if (!allowed) return;

        const body = buildApprovalWhatsApp({
          pharmacyName,
          fullName: payload.fullName,
          email:    payload.email,
          lang,
        });
        await sendWhatsApp({ to: payload.phone!, body });
      })
      .catch((err: unknown) => {
        logger.error(
          "notification-sender: failed to dispatch tenant approval WhatsApp",
          { error: err instanceof Error ? err.message : String(err), tenantId: payload.tenantId },
        );
      });
  }
}
