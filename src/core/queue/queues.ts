import { Queue } from "bullmq";
import { OcrDocumentType } from "@prisma/client";
import { bullmqConnection } from "./bullmq";

// ─── OCR Queue ───────────────────────────────────────────────────────────────

export const OCR_QUEUE_NAME = "ocr";

export interface OcrJobData {
  documentId: string;
  tenantId: string;
  userId: string;
  /** Relative path from process.cwd() (as stored in DB) */
  filePath: string;
  mimeType: string;
  documentType: OcrDocumentType;
}

export const ocrQueue = new Queue<OcrJobData>(OCR_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: {
    // 4 total attempts with exponential backoff: 0s → 15s → 30s → 60s
    // The extractor itself falls back to gemini-2.0-flash on 503 within attempt 1,
    // so BullMQ retries are a last-resort safety net for genuine transient failures.
    attempts: 4,
    backoff: { type: "exponential", delay: 15_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});
