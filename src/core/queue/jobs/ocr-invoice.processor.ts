import path from "path";
import { Worker, Job } from "bullmq";
import { Prisma, OcrDocumentStatus, OcrDocumentType } from "@prisma/client";
import { bullmqConnection } from "../bullmq";
import { OCR_QUEUE_NAME, OcrJobData } from "../queues";
import { ocrRepository } from "../../../modules/tenant/ocr/repository/ocr.repository";
import { stubInvoiceExtractor } from "../../../modules/tenant/ocr/extractor/stub-invoice.extractor";
import { handleOcrPrescription } from "./ocr-prescription.processor";
import { logger } from "../../logger/logger";

async function handleOcrInvoice(data: OcrJobData): Promise<void> {
  const { documentId, tenantId, filePath, mimeType } = data;
  const absoluteFilePath = path.join(process.cwd(), filePath);

  // Mark in-progress (also handles re-attempts after transient failures)
  await ocrRepository.updateStatus(documentId, OcrDocumentStatus.PROCESSING);

  try {
    const doc = await ocrRepository.findById(tenantId, documentId);
    if (!doc) throw new Error(`Document ${documentId} not found for tenant ${tenantId}`);

    const extracted = await stubInvoiceExtractor.extract(absoluteFilePath, mimeType);

    await ocrRepository.updateExtractedData(
      documentId,
      extracted as unknown as Prisma.InputJsonValue,
    );

    logger.info("Invoice OCR completed", { documentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await ocrRepository.updateStatus(documentId, OcrDocumentStatus.FAILED, message);
    logger.error("Invoice OCR failed", { documentId, error });
    throw error;
  }
}

async function handleOcrJob(job: Job<OcrJobData>): Promise<void> {
  const { documentType } = job.data;

  if (documentType === OcrDocumentType.INVOICE) {
    return handleOcrInvoice(job.data);
  }

  if (documentType === OcrDocumentType.PRESCRIPTION) {
    return handleOcrPrescription(job.data);
  }

  logger.warn("OCR worker: unknown document type — skipping", { documentType });
}

export function startOcrInvoiceWorker(): Worker<OcrJobData> {
  const worker = new Worker<OcrJobData>(OCR_QUEUE_NAME, handleOcrJob, {
    connection: bullmqConnection,
    concurrency: 3,
  });

  worker.on("completed", (job) => {
    logger.info("OCR job completed", { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logger.error("OCR job failed", { jobId: job?.id, error: err.message });
  });

  return worker;
}
