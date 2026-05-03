import path from "path";
import { Worker, Job } from "bullmq";
import { NotificationType, Prisma, OcrDocumentStatus, OcrDocumentType } from "@prisma/client";
import { bullmqConnection } from "../bullmq";
import { OCR_QUEUE_NAME, OcrJobData } from "../queues";
import { ocrRepository } from "../../../modules/tenant/ocr/repository/ocr.repository";
import { geminiInvoiceExtractor } from "../../../modules/tenant/ocr/extractor/gemini-invoice.extractor";
import { notificationsRepository } from "../../../modules/tenant/notifications/repository/notifications.repository";
import { handleOcrPrescription } from "./ocr-prescription.processor";
import { logger } from "../../logger/logger";

async function handleOcrInvoice(data: OcrJobData): Promise<void> {
  const { documentId, tenantId, userId, filePath, mimeType } = data;
  const absoluteFilePath = path.join(process.cwd(), filePath);

  // Mark in-progress (also handles re-attempts after transient failures)
  await ocrRepository.updateStatus(documentId, OcrDocumentStatus.PROCESSING);

  try {
    const doc = await ocrRepository.findById(tenantId, documentId);
    if (!doc) throw new Error(`Document ${documentId} not found for tenant ${tenantId}`);

    const extracted = await geminiInvoiceExtractor.extract(absoluteFilePath, mimeType);

    await ocrRepository.updateExtractedData(
      documentId,
      extracted as unknown as Prisma.InputJsonValue,
    );

    logger.info("Invoice OCR completed", { documentId, confidence: extracted.confidence });

    // Fire-and-forget inbox notification
    notificationsRepository
      .create({
        tenantId,
        userId,
        type: NotificationType.OCR_COMPLETED,
        title: "Invoice OCR completed",
        body:
          extracted.confidence >= 0.85 // Gemini 2.5 Flash calibration — 0.85 reflects reliable extraction
            ? `Invoice processed successfully (confidence: ${Math.round(extracted.confidence * 100)}%).`
            : `Invoice processed but confidence is low (${Math.round(extracted.confidence * 100)}%). Please review the extracted data.`,
        metadata: {
          refId: documentId,
          documentId,
          documentType: OcrDocumentType.INVOICE,
          confidence: extracted.confidence,
          invoiceNumber: extracted.invoiceNumber,
        },
      })
      .catch((err: unknown) => {
        logger.error("ocr-invoice: failed to create OCR_COMPLETED notification", {
          documentId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await ocrRepository.updateStatus(documentId, OcrDocumentStatus.FAILED, message);
    logger.error("Invoice OCR failed", { documentId, error });

    // Fire-and-forget failure notification
    notificationsRepository
      .create({
        tenantId,
        userId,
        type: NotificationType.OCR_FAILED,
        title: "Invoice OCR failed",
        body: `Invoice processing failed: ${message}`,
        metadata: {
          refId: documentId,
          documentId,
          documentType: OcrDocumentType.INVOICE,
          errorMessage: message,
        },
      })
      .catch((notifErr: unknown) => {
        logger.error("ocr-invoice: failed to create OCR_FAILED notification", {
          documentId,
          error: notifErr instanceof Error ? notifErr.message : String(notifErr),
        });
      });

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
