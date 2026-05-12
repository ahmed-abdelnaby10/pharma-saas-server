import { NotificationType } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { Translator } from "../../../../shared/types/locale.types";
import { sendEmail } from "../../../../core/email/email.service";
import { buildAlertSummaryEmail } from "../../../../core/email/templates/alert-summary.template";
import { sendWhatsApp, tenantHasWhatsApp } from "../../../../core/whatsapp/whatsapp.service";
import { buildAlertWhatsApp } from "../../../../core/whatsapp/whatsapp.templates";
import { settingsRepository } from "../../settings/repository/settings.repository";
import { notificationsRepository } from "../../notifications/repository/notifications.repository";
import { QueryLowStockDto, QueryExpiringDto } from "../dto/query-alerts.dto";

export interface LowStockAlert {
  inventoryItemId: string;
  branchId: string;
  catalogItemId: string;
  catalogNameEn: string;
  catalogNameAr: string;
  quantityOnHand: string;
  reorderLevel: string;
}

export interface ExpiryAlert {
  batchId: string;
  inventoryItemId: string;
  branchId: string;
  catalogItemId: string;
  catalogNameEn: string;
  catalogNameAr: string;
  batchNumber: string;
  expiryDate: Date;
  quantityOnHand: string;
  daysUntilExpiry: number;
}

export class AlertsService {
  async getLowStockAlerts(
    tenantId: string,
    query: QueryLowStockDto,
    t: Translator,
  ): Promise<LowStockAlert[]> {
    const settings = await settingsRepository.findByTenant(tenantId);
    if (!settings?.lowStockAlerts) {
      return [];
    }

    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        branchId: query.branchId,
        isActive: true,
        reorderLevel: { not: null },
      },
      include: {
        catalogItem: { select: { nameEn: true, nameAr: true } },
      },
    });

    return items
      .filter((item) => item.reorderLevel !== null && item.quantityOnHand.lte(item.reorderLevel))
      .map((item) => ({
        inventoryItemId: item.id,
        branchId: item.branchId,
        catalogItemId: item.catalogItemId,
        catalogNameEn: item.catalogItem.nameEn,
        catalogNameAr: item.catalogItem.nameAr,
        quantityOnHand: item.quantityOnHand.toString(),
        reorderLevel: item.reorderLevel!.toString(),
      }));
  }

  async getExpiringAlerts(
    tenantId: string,
    query: QueryExpiringDto,
    t: Translator,
  ): Promise<ExpiryAlert[]> {
    const settings = await settingsRepository.findByTenant(tenantId);
    if (!settings?.expiryAlerts) {
      return [];
    }

    // Use explicit query days, falling back to the tenant's configured window
    const windowDays = query.days ?? settings.expiryAlertWindowDays;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + windowDays);
    const now = new Date();

    const batches = await prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        branchId: query.branchId,
        isActive: true,
        quantityOnHand: { gt: 0 },
        expiryDate: { lte: cutoff },
      },
      include: {
        inventoryItem: {
          include: {
            catalogItem: { select: { nameEn: true, nameAr: true, id: true } },
          },
        },
      },
      orderBy: [{ expiryDate: "asc" }],
    });

    return batches.map((batch) => {
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysUntilExpiry = Math.ceil(
        (batch.expiryDate.getTime() - now.getTime()) / msPerDay,
      );
      return {
        batchId: batch.id,
        inventoryItemId: batch.inventoryItemId,
        branchId: batch.branchId,
        catalogItemId: batch.inventoryItem.catalogItem.id,
        catalogNameEn: batch.inventoryItem.catalogItem.nameEn,
        catalogNameAr: batch.inventoryItem.catalogItem.nameAr,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantityOnHand: batch.quantityOnHand.toString(),
        daysUntilExpiry,
      };
    });
  }

  /** Combined helper — returns both low-stock and expiry alerts in one call. */
  async getAll(
    tenantId: string,
    query: QueryLowStockDto & { days?: number },
    t: Translator,
  ) {
    const [lowStock, expiring] = await Promise.all([
      this.getLowStockAlerts(tenantId, { branchId: query.branchId }, t),
      this.getExpiringAlerts(tenantId, { branchId: query.branchId, days: query.days }, t),
    ]);
    return { lowStock, expiring };
  }

  /**
   * Dispatches Notification records into the current user's inbox for every
   * active alert. Skips items already notified within the last 48 hours to
   * avoid spam.
   *
   * After creating notifications, sends a summary email to the tenant_owner
   * user(s) — fire-and-forget, never blocks the response.
   *
   * Returns a summary of created vs skipped counts.
   */
  async dispatchAlertNotifications(
    auth: TenantAuthContext,
    branchId: string,
    days?: number,
  ): Promise<{ created: number; skipped: number }> {
    const t: Translator = (key) => key;

    // Load settings once — drives both the expiry window and the email payload
    const settings = await settingsRepository.findByTenant(auth.tenantId);
    const expiryWindowDays = days ?? settings?.expiryAlertWindowDays ?? 30;

    const [lowStockAlerts, expiryAlerts, recentLowStockRefs, recentExpiryRefs] =
      await Promise.all([
        this.getLowStockAlerts(auth.tenantId, { branchId }, t),
        this.getExpiringAlerts(auth.tenantId, { branchId, days: expiryWindowDays }, t),
        notificationsRepository.findRecentRefIds(
          auth.tenantId,
          auth.userId,
          [NotificationType.LOW_STOCK],
          48,
        ),
        notificationsRepository.findRecentRefIds(
          auth.tenantId,
          auth.userId,
          [NotificationType.EXPIRY_ALERT],
          48,
        ),
      ]);

    let created = 0;
    let skipped = 0;

    // ── Low-stock notifications ──────────────────────────────────────────────
    for (const alert of lowStockAlerts) {
      if (recentLowStockRefs.has(alert.inventoryItemId)) {
        skipped++;
        continue;
      }
      await notificationsRepository.create({
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: NotificationType.LOW_STOCK,
        title: `Low stock: ${alert.catalogNameEn}`,
        body: `Quantity on hand (${alert.quantityOnHand}) is at or below reorder level (${alert.reorderLevel}).`,
        metadata: {
          refId: alert.inventoryItemId,
          inventoryItemId: alert.inventoryItemId,
          branchId: alert.branchId,
          catalogItemId: alert.catalogItemId,
          catalogNameEn: alert.catalogNameEn,
          catalogNameAr: alert.catalogNameAr,
          quantityOnHand: alert.quantityOnHand,
          reorderLevel: alert.reorderLevel,
        },
      });
      created++;
    }

    // ── Expiry notifications ─────────────────────────────────────────────────
    for (const alert of expiryAlerts) {
      if (recentExpiryRefs.has(alert.batchId)) {
        skipped++;
        continue;
      }
      const urgency = alert.daysUntilExpiry <= 0 ? "EXPIRED" : `${alert.daysUntilExpiry}d`;
      await notificationsRepository.create({
        tenantId: auth.tenantId,
        userId: auth.userId,
        type: NotificationType.EXPIRY_ALERT,
        title: `Expiry alert [${urgency}]: ${alert.catalogNameEn}`,
        body:
          alert.daysUntilExpiry <= 0
            ? `Batch ${alert.batchNumber} has expired. Qty: ${alert.quantityOnHand}.`
            : `Batch ${alert.batchNumber} expires in ${alert.daysUntilExpiry} day(s). Qty: ${alert.quantityOnHand}.`,
        metadata: {
          refId: alert.batchId,
          batchId: alert.batchId,
          inventoryItemId: alert.inventoryItemId,
          branchId: alert.branchId,
          catalogItemId: alert.catalogItemId,
          catalogNameEn: alert.catalogNameEn,
          catalogNameAr: alert.catalogNameAr,
          batchNumber: alert.batchNumber,
          expiryDate: alert.expiryDate.toISOString(),
          daysUntilExpiry: alert.daysUntilExpiry,
          quantityOnHand: alert.quantityOnHand,
        },
      });
      created++;
    }

    // ── Email + WhatsApp summary to tenant owner(s) — fire-and-forget ────────
    if (created > 0) {
      const freshLowStock = lowStockAlerts.filter((a) => !recentLowStockRefs.has(a.inventoryItemId));
      const freshExpiry   = expiryAlerts.filter((a) => !recentExpiryRefs.has(a.batchId));

      void this.notifyOwners(
        auth.tenantId,
        settings?.tenant.nameEn ?? "",
        settings?.tenant.nameAr ?? "",
        freshLowStock,
        freshExpiry,
      );
    }

    return { created, skipped };
  }

  /**
   * Finds all tenant_owner users and sends each of them:
   *  1. A bilingual HTML alert summary email (always)
   *  2. A WhatsApp summary message (if tenant plan has WhatsApp AND owner has a phone)
   *
   * Fire-and-forget — never throws.
   */
  private async notifyOwners(
    tenantId: string,
    pharmacyNameEn: string,
    pharmacyNameAr: string,
    lowStockItems: LowStockAlert[],
    expiryItems: ExpiryAlert[],
  ): Promise<void> {
    try {
      const [ownerRole, whatsAppAllowed] = await Promise.all([
        prisma.role.findFirst({
          where: { tenantId, code: "tenant_owner", isActive: true },
          include: {
            userRoles: {
              include: {
                user: {
                  select: { email: true, fullName: true, phone: true, preferredLanguage: true, isActive: true },
                },
              },
            },
          },
        }),
        tenantHasWhatsApp(tenantId),
      ]);

      if (!ownerRole) return;

      const ownerUsers = ownerRole.userRoles
        .map((ur) => ur.user)
        .filter((u) => u.isActive);

      for (const owner of ownerUsers) {
        const lang = (owner.preferredLanguage ?? "en") as "en" | "ar";

        // ── Email ──────────────────────────────────────────────────────────
        const { subject, html } = buildAlertSummaryEmail({
          pharmacyNameEn,
          pharmacyNameAr,
          lowStockItems,
          expiryItems,
          lang,
        });
        await sendEmail({ to: owner.email, subject, html });

        // ── WhatsApp ───────────────────────────────────────────────────────
        if (whatsAppAllowed && owner.phone) {
          const pharmacyName = lang === "ar" ? pharmacyNameAr : pharmacyNameEn;
          const body = buildAlertWhatsApp({
            pharmacyName,
            lowStockCount: lowStockItems.length,
            expiryCount:   expiryItems.length,
            lang,
          });
          await sendWhatsApp({ to: owner.phone, body });
        }
      }
    } catch {
      // Never block the caller — notifications are best-effort
    }
  }
}

export const alertsService = new AlertsService();
