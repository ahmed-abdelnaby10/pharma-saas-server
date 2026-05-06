import { logger } from "../logger/logger";

/**
 * Fire-and-forget notification dispatcher.
 *
 * All functions here swallow errors so notification failures never break the
 * main request flow.  Email / SMS delivery will be wired in once the email
 * service is available.  For now each function logs the intent so nothing is
 * silently lost.
 */

export interface ApprovalNotificationPayload {
  /** Applicant e-mail – will receive the welcome / approval email */
  email: string;
  pharmacyNameEn: string;
  pharmacyNameAr: string;
  preferredLanguage: string;
  tenantId: string;
}

/**
 * Notify both the applicant and the platform team when a signup request is
 * approved and a new tenant account is created.
 *
 * TODO: replace the logger.info stubs with real email / SMS calls once the
 *       notification service is wired up.
 */
export function notifySignupApproval(
  payload: ApprovalNotificationPayload,
): void {
  // ── Tenant welcome e-mail (to applicant) ─────────────────────────────────
  Promise.resolve()
    .then(() => {
      logger.info("notification-sender: [TODO] send approval email to tenant", {
        to: payload.email,
        pharmacyNameEn: payload.pharmacyNameEn,
        pharmacyNameAr: payload.pharmacyNameAr,
        tenantId: payload.tenantId,
        lang: payload.preferredLanguage,
        template: "tenant_welcome",
      });
    })
    .catch((err: unknown) => {
      logger.error(
        "notification-sender: failed to dispatch tenant approval email",
        { error: err instanceof Error ? err.message : String(err), payload },
      );
    });

  // ── Platform admin confirmation e-mail ────────────────────────────────────
  Promise.resolve()
    .then(() => {
      logger.info(
        "notification-sender: [TODO] send approval confirmation to platform",
        {
          tenantId: payload.tenantId,
          pharmacyNameEn: payload.pharmacyNameEn,
          template: "platform_signup_approved",
        },
      );
    })
    .catch((err: unknown) => {
      logger.error(
        "notification-sender: failed to dispatch platform confirmation email",
        { error: err instanceof Error ? err.message : String(err), payload },
      );
    });
}
