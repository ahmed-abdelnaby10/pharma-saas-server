import { Queue } from "bullmq";
import { OcrDocumentType } from "@prisma/client";
import { bullmqConnection } from "./bullmq";

// ─── OCR Queue ───────────────────────────────────────────────────────────────

export const OCR_QUEUE_NAME = "ocr";

export interface OcrJobData {
  documentId: string;
  tenantId: string;
  /** Relative path from process.cwd() (as stored in DB) */
  filePath: string;
  mimeType: string;
  documentType: OcrDocumentType;
}

export const ocrQueue = new Queue<OcrJobData>(OCR_QUEUE_NAME, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});
