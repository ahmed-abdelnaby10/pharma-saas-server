import { Worker } from "bullmq";
import { createApp } from "./app";
import { appConfig } from "./core/config/app.config";
import { connectRedis, disconnectRedis } from "./core/cache/redis";
import { connectPrisma, disconnectPrisma } from "./core/db/prisma";
import { startOcrInvoiceWorker } from "./core/queue/jobs/ocr-invoice.processor";
import { startTrialReminderWorker } from "./core/queue/jobs/trial-reminder.processor";
import { logger } from "./core/logger/logger";

let isShuttingDown = false;
let ocrWorker: Worker | undefined;
let trialReminderWorker: Worker | undefined;

const shutdown = async (signal: NodeJS.Signals) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}. Shutting down gracefully.`);

  try {
    await Promise.all([
      disconnectRedis(),
      disconnectPrisma(),
      ocrWorker?.close(),
      trialReminderWorker?.close(),
    ]);
    process.exit(0);
  } catch (error) {
    logger.error("Failed to shutdown gracefully", error);
    process.exit(1);
  }
};

const start = async () => {
  try {
    await connectPrisma();
    await connectRedis();

    ocrWorker = startOcrInvoiceWorker();
    trialReminderWorker = startTrialReminderWorker();

    const app = createApp();

    app.listen(appConfig.port, () => {
      logger.info(`${appConfig.name} running on port ${appConfig.port}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void start();
