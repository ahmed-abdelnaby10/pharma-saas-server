import { Worker, Queue } from "bullmq";
import { NotificationType } from "@prisma/client";
import { bullmqConnection } from "../bullmq";
import { prisma } from "../../db/prisma";
import { notificationsRepository } from "../../../modules/tenant/notifications/repository/notifications.repository";
import { logger } from "../../logger/logger";

const TRIAL_REMINDER_QUEUE = "trial-reminder";

// Warning windows (days before trial ends)
const WARNING_DAYS = [7, 3, 1];

async function runTrialReminders(): Promise<void> {
  const now = new Date();

  for (const days of WARNING_DAYS) {
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() + days);
    windowStart.setHours(0, 0, 0, 0);

    const windowEnd = new Date(windowStart);
    windowEnd.setHours(23, 59, 59, 999);

    // Find all trialing subscriptions whose trial ends within this day window
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: "trialing",
        trialEndsAt: { gte: windowStart, lte: windowEnd },
      },
      select: {
        tenantId: true,
        trialEndsAt: true,
      },
    });

    if (subscriptions.length === 0) continue;

    logger.info(`Trial reminder: found ${subscriptions.length} tenants with trial ending in ${days}d`);

    for (const sub of subscriptions) {
      // Get all active users in the tenant to notify
      const users = await prisma.tenantUser.findMany({
        where: { tenantId: sub.tenantId, isActive: true },
        select: { id: true },
      });

      for (const user of users) {
        await notificationsRepository
          .create({
            tenantId: sub.tenantId,
            userId: user.id,
            type: NotificationType.TRIAL_EXPIRY_WARNING,
            title: `Trial expires in ${days} day${days > 1 ? "s" : ""}`,
            body: `Your free trial ends on ${sub.trialEndsAt?.toLocaleDateString() ?? "soon"}. Please subscribe to continue using the system.`,
            metadata: {
              daysRemaining: days,
              trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
            },
          })
          .catch((err: unknown) => {
            logger.error("trial-reminder: failed to create notification", {
              tenantId: sub.tenantId,
              userId: user.id,
              error: err instanceof Error ? err.message : String(err),
            });
          });
      }
    }
  }

  // Also mark expired trials — flip subscriptions past trialEndsAt to 'expired'
  const expired = await prisma.subscription.updateMany({
    where: {
      status: "trialing",
      trialEndsAt: { lt: now },
    },
    data: { status: "expired" },
  });

  if (expired.count > 0) {
    logger.info(`Trial reminder: expired ${expired.count} subscriptions`);

    // Notify users in expired tenants
    const expiredSubs = await prisma.subscription.findMany({
      where: { status: "expired", trialEndsAt: { lt: now, gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      select: { tenantId: true },
    });

    for (const sub of expiredSubs) {
      const users = await prisma.tenantUser.findMany({
        where: { tenantId: sub.tenantId, isActive: true },
        select: { id: true },
      });

      for (const user of users) {
        await notificationsRepository
          .create({
            tenantId: sub.tenantId,
            userId: user.id,
            type: NotificationType.SUBSCRIPTION_EXPIRED,
            title: "Trial has ended",
            body: "Your free trial has expired. Subscribe to restore full access.",
            metadata: { tenantId: sub.tenantId },
          })
          .catch(() => {
            /* best-effort */
          });
      }
    }
  }
}

export function startTrialReminderWorker(): Worker {
  // Use a singleton repeatable job via a dummy queue+worker pattern.
  // The worker runs the job immediately on first boot, then every 24h.
  const queue = new Queue(TRIAL_REMINDER_QUEUE, { connection: bullmqConnection });

  // Upsert the repeatable job (idempotent — same jobId removes old if same pattern)
  queue
    .add(
      "daily-trial-check",
      {},
      {
        jobId: "daily-trial-check",
        repeat: { pattern: "0 3 * * *" }, // 03:00 UTC daily
        removeOnComplete: { count: 5 },
        removeOnFail: { count: 5 },
      },
    )
    .catch((err) => {
      logger.error("Failed to schedule trial reminder repeatable job", err);
    });

  const worker = new Worker(
    TRIAL_REMINDER_QUEUE,
    async () => {
      logger.info("Running daily trial reminder check...");
      await runTrialReminders();
    },
    {
      connection: bullmqConnection,
      concurrency: 1,
    },
  );

  worker.on("completed", () => {
    logger.info("Trial reminder job completed");
  });

  worker.on("failed", (_job, err) => {
    logger.error("Trial reminder job failed", { error: err.message });
  });

  return worker;
}
