import path from "path";
import { NotificationType, Prisma, OcrDocumentStatus, OcrDocumentType } from "@prisma/client";
import { OcrJobData } from "../queues";
import { ocrRepository } from "../../../modules/tenant/ocr/repository/ocr.repository";
import { geminiPrescriptionExtractor } from "../../../modules/tenant/ocr/extractor/gemini-prescription.extractor";
import { notificationsRepository } from "../../../modules/tenant/notifications/repository/notifications.repository";
import { logger } from "../../logger/logger";

/**
 * Handles PRESCRIPTION OCR jobs.
 * Called by the unified OCR worker (ocr-invoice.processor.ts) when
 * documentType === PRESCRIPTION.
 */
export async function handleOcrPrescription(data: OcrJobData): Promise<void> {
  const { documentId, tenantId, userId, filePath, mimeType } = data;
  const absoluteFilePath = path.join(process.cwd(), filePath);

  await ocrRepository.updateStatus(documentId, OcrDocumentStatus.PROCESSING);

  try {
    const doc = await ocrRepository.findById(tenantId, documentId);
    if (!doc) throw new Error(`Document ${documentId} not found for tenant ${tenantId}`);

    const extracted = await geminiPrescriptionExtractor.extract(absoluteFilePath, mimeType);

    await ocrRepository.updateExtractedData(
      documentId,
      extracted as unknown as Prisma.InputJsonValue,
    );

    logger.info("Prescription OCR completed", { documentId, confidence: extracted.confidence });

    // Fire-and-forget inbox notification
    notificationsRepository
      .create({
        tenantId,
        userId,
        type: NotificationType.OCR_COMPLETED,
        title: "Prescription OCR completed",
        body:
          extracted.confidence >= 0.85 // Gemini 2.5 Flash calibration — 0.85 reflects reliable extraction
            ? `Prescription processed successfully (confidence: ${Math.round(extracted.confidence * 100)}%).`
            : `Prescription processed but confidence is low (${Math.round(extracted.confidence * 100)}%). Please review the extracted data.`,
        metadata: {
          refId: documentId,
          documentId,
          documentType: OcrDocumentType.PRESCRIPTION,
          confidence: extracted.confidence,
          patientName: extracted.patientName,
          medicationCount: extracted.medications.length,
        },
      })
      .catch((err: unknown) => {
        logger.error("ocr-prescription: failed to create OCR_COMPLETED notification", {
          documentId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await ocrRepository.updateStatus(documentId, OcrDocumentStatus.FAILED, message);
    logger.error("Prescription OCR failed", { documentId, error });

    // Fire-and-forget failure notification
    notificationsRepository
      .create({
        tenantId,
        userId,
        type: NotificationType.OCR_FAILED,
        title: "Prescription OCR failed",
        body: `Prescription processing failed: ${message}`,
        metadata: {
          refId: documentId,
          documentId,
          documentType: OcrDocumentType.PRESCRIPTION,
          errorMessage: message,
        },
      })
      .catch((notifErr: unknown) => {
        logger.error("ocr-prescription: failed to create OCR_FAILED notification", {
          documentId,
          error: notifErr instanceof Error ? notifErr.message : String(notifErr),
        });
      });

    throw error;
  }
}
