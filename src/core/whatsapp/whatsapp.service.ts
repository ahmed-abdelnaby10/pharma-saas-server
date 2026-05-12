import { env } from "../config/env";
import { logger } from "../logger/logger";
import { usageLimitService } from "../usage/usage-limit.service";
import { FeatureKey } from "../../shared/constants/feature-keys";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SendWhatsAppOptions {
  /**
   * Recipient phone number WITH country code, e.g. "+966501234567".
   * The "whatsapp:" prefix is added automatically if missing.
   */
  to: string;
  body: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function isConfigured(): boolean {
  return !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM);
}

function normalise(phone: string): string {
  return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns true when the tenant's active plan has the WhatsApp notifications
 * feature enabled (or has a tenant-level override that enables it).
 *
 * Never throws — returns false on any error.
 */
export async function tenantHasWhatsApp(tenantId: string): Promise<boolean> {
  try {
    const entitlements = await usageLimitService.getEffectiveEntitlements(tenantId);
    const feat = entitlements.find((e) => e.featureKey === FeatureKey.WHATSAPP_NOTIFICATIONS);
    return feat?.enabled === true;
  } catch {
    return false;
  }
}

/**
 * Sends a WhatsApp message via Twilio REST API.
 *
 * - Silently skips when Twilio credentials are not configured.
 * - Never throws — WhatsApp failure must never break the main request flow.
 * - Callers should use `void sendWhatsApp(...)` for true fire-and-forget.
 */
export async function sendWhatsApp(opts: SendWhatsAppOptions): Promise<void> {
  if (!isConfigured()) {
    if (env.NODE_ENV !== "production") {
      logger.debug("[whatsapp] not configured — skipping", { to: opts.to });
    }
    return;
  }

  const sid   = env.TWILIO_ACCOUNT_SID!;
  const token = env.TWILIO_AUTH_TOKEN!;
  const from  = env.TWILIO_WHATSAPP_FROM!;

  try {
    const url         = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const credentials = Buffer.from(`${sid}:${token}`).toString("base64");
    const payload     = new URLSearchParams({
      From: from,
      To:   normalise(opts.to),
      Body: opts.body,
    });

    const response = await fetch(url, {
      method:  "POST",
      headers: {
        Authorization:  `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error("[whatsapp] Twilio API error", {
        status: response.status,
        body:   text,
        to:     opts.to,
      });
      return;
    }

    if (env.NODE_ENV !== "production") {
      const data = (await response.json()) as { sid: string };
      logger.info("[whatsapp] sent", { to: opts.to, messageSid: data.sid });
    }
  } catch (err) {
    // Never throw — WhatsApp failure must never break the main flow
    logger.error("[whatsapp] unexpected error", {
      error: err instanceof Error ? err.message : String(err),
      to:    opts.to,
    });
  }
}
