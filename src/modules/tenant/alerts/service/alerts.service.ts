import { NotificationType } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { Translator } from "../../../../shared/types/locale.types";
import { sendEmail } from "../../../../core/email/email.service";
import { buildAlertSummaryEmail } from "../../../../core/email/templates/alert-summary.template";
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

    // ── Email summary to tenant owner(s) — fire-and-forget ──────────────────
    if (created > 0) {
      void this.sendAlertEmailToOwners(
        auth.tenantId,
        settings?.tenant.nameEn ?? "",
        settings?.tenant.nameAr ?? "",
        lowStockAlerts.filter((a) => !recentLowStockRefs.has(a.inventoryItemId)),
        expiryAlerts.filter((a) => !recentExpiryRefs.has(a.batchId)),
      );
    }

    return { created, skipped };
  }

  /**
   * Finds all users with the tenant_owner role and sends each of them
   * a bilingual alert summary email. Fire-and-forget — never throws.
   */
  private async sendAlertEmailToOwners(
    tenantId: string,
    pharmacyNameEn: string,
    pharmacyNameAr: string,
    lowStockItems: LowStockAlert[],
    expiryItems: ExpiryAlert[],
  ): Promise<void> {
    try {
      const ownerRole = await prisma.role.findFirst({
        where: { tenantId, code: "tenant_owner", isActive: true },
        include: {
          userRoles: {
            include: {
              user: {
                select: { email: true, fullName: true, preferredLanguage: true, isActive: true },
              },
            },
          },
        },
      });

      if (!ownerRole) return;

      const ownerUsers = ownerRole.userRoles
        .map((ur) => ur.user)
        .filter((u) => u.isActive);

      for (const owner of ownerUsers) {
        const lang = (owner.preferredLanguage ?? "en") as "en" | "ar";
        const { subject, html } = buildAlertSummaryEmail({
          pharmacyNameEn,
          pharmacyNameAr,
          lowStockItems,
          expiryItems,
          lang,
        });
        await sendEmail({ to: owner.email, subject, html });
      }
    } catch {
      // Never block the caller — email is best-effort
    }
  }
}

export const alertsService = new AlertsService();
