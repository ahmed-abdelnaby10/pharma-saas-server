import path from "path";
import { Prisma, OcrDocumentStatus } from "@prisma/client";
import { OcrJobData } from "../queues";
import { ocrRepository } from "../../../modules/tenant/ocr/repository/ocr.repository";
import { stubPrescriptionExtractor } from "../../../modules/tenant/ocr/extractor/stub-prescription.extractor";
import { logger } from "../../logger/logger";

/**
 * Handles PRESCRIPTION OCR jobs.
 * Called by the unified OCR worker (ocr-invoice.processor.ts) when
 * documentType === PRESCRIPTION.
 */
export async function handleOcrPrescription(data: OcrJobData): Promise<void> {
  const { documentId, tenantId, filePath, mimeType } = data;
  const absoluteFilePath = path.join(process.cwd(), filePath);

  await ocrRepository.updateStatus(documentId, OcrDocumentStatus.PROCESSING);

  try {
    const doc = await ocrRepository.findById(tenantId, documentId);
    if (!doc) throw new Error(`Document ${documentId} not found for tenant ${tenantId}`);

    const extracted = await stubPrescriptionExtractor.extract(absoluteFilePath, mimeType);

    await ocrRepository.updateExtractedData(
      documentId,
      extracted as unknown as Prisma.InputJsonValue,
    );

    logger.info("Prescription OCR completed", { documentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await ocrRepository.updateStatus(documentId, OcrDocumentStatus.FAILED, message);
    logger.error("Prescription OCR failed", { documentId, error });
    throw error;
  }
}
