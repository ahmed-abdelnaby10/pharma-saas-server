import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Optional plain-text fallback shown by clients that block HTML */
  text?: string;
  /** Override reply-to (defaults to sender address) */
  replyTo?: string;
}

// ── Build the transporter once at module load ─────────────────────────────────

function buildTransporter(): Transporter {
  // Gmail app-password shorthand
  if (env.EMAIL_SERVICE_USER && env.EMAIL_SERVICE_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.EMAIL_SERVICE_USER,
        pass: env.EMAIL_SERVICE_PASSWORD,
      },
    });
  }

  // Full SMTP config (any provider)
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  // No config — return a stub that logs instead of sending
  return nodemailer.createTransport({ jsonTransport: true });
}

const transporter = buildTransporter();

/** Resolved sender address — used in From + Reply-To */
const senderAddress =
  env.EMAIL_SERVICE_USER ??
  env.SMTP_USER ??
  "noreply@pharmasaas.com";

const fromDisplay = `${env.APP_NAME} <${senderAddress}>`;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fire-and-forget email sender.
 * Errors are logged but never thrown — callers are never blocked.
 *
 * Anti-spam measures applied:
 *  - Friendly `From` display name
 *  - `Reply-To` header
 *  - `X-Mailer` header suppressed
 *  - Multipart/alternative (html + text fallback)
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: fromDisplay,
      to: options.to,
      subject: options.subject,
      replyTo: options.replyTo ?? senderAddress,
      html: options.html,
      text: options.text ?? stripHtml(options.html),
      headers: {
        // Suppress mailer header — some spam filters penalise "nodemailer"
        "X-Mailer": env.APP_NAME,
        // Identify as a transactional email (not bulk marketing)
        "X-Email-Type": "transactional",
        // Precedence bulk tells auto-responders not to reply
        Precedence: "bulk",
      },
    });

    if (env.NODE_ENV !== "production") {
      console.log(`[email] sent to ${options.to} — ${options.subject} (${info.messageId})`);
    }
  } catch (err) {
    // Never throw — email failure must never break the main flow
    console.error(`[email] failed to send to ${options.to}:`, err);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
