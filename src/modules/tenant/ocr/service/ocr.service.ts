import { OcrDocumentStatus, OcrDocumentType, Prisma } from "@prisma/client";
import { Translator } from "../../../../shared/types/locale.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { ocrRepository } from "../repository/ocr.repository";
import { QueryOcrDocumentsDto } from "../dto/query-ocr.dto";
import { OcrDocumentRecord } from "../mapper/ocr.mapper";
import { toRelativePath } from "../upload/multer.config";
import { ocrQueue } from "../../../../core/queue/queues";
import { suppliersRepository } from "../../suppliers/repository/suppliers.repository";
import { InvoiceExtractedData } from "../extractor/invoice-extracted-data.type";
import { logger } from "../../../../core/logger/logger";

export interface AutoCreatedSupplier {
  id:      string;
  nameEn:  string;
  nameAr:  string;
  taxId:   string | null;
  /** true = newly inserted; false = already existed and was reused */
  created: boolean;
}

export interface ReviewDocumentResult {
  doc:                  OcrDocumentRecord;
  autoCreatedSupplier:  AutoCreatedSupplier | null;
}

export class OcrService {
  async listDocuments(
    tenantId: string,
    query: QueryOcrDocumentsDto,
    t: Translator,
  ): Promise<OcrDocumentRecord[]> {
    return ocrRepository.list(tenantId, query);
  }

  async getDocument(
    tenantId: string,
    documentId: string,
    t: Translator,
  ): Promise<OcrDocumentRecord> {
    const doc = await ocrRepository.findById(tenantId, documentId);
    if (!doc) {
      throw new NotFoundError(t("ocr.not_found"));
    }
    return doc;
  }

  async uploadDocument(
    tenantId: string,
    branchId: string,
    documentType: OcrDocumentType,
    file: Express.Multer.File,
    t: Translator,
  ): Promise<OcrDocumentRecord> {
    if (!file) {
      throw new BadRequestError(t("ocr.file_required"));
    }

    const doc = await ocrRepository.create({
      tenantId,
      branchId,
      documentType,
      fileName: file.originalname,
      filePath: toRelativePath(file.path),
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    return doc;
  }

  async triggerProcessing(
    tenantId: string,
    userId: string,
    documentId: string,
    t: Translator,
  ): Promise<OcrDocumentRecord> {
    const doc = await ocrRepository.findById(tenantId, documentId);
    if (!doc) {
      throw new NotFoundError(t("ocr.not_found"));
    }

    const supported: OcrDocumentType[] = [OcrDocumentType.INVOICE, OcrDocumentType.PRESCRIPTION];
    if (!supported.includes(doc.documentType)) {
      throw new BadRequestError(t("ocr.unsupported_type"));
    }

    if (doc.status !== OcrDocumentStatus.PENDING) {
      throw new ConflictError(t("ocr.not_pending"));
    }

    const jobName =
      doc.documentType === OcrDocumentType.INVOICE ? "process-invoice" : "process-prescription";

    await ocrQueue.add(jobName, {
      documentId: doc.id,
      tenantId: doc.tenantId,
      userId,
      filePath: doc.filePath,
      mimeType: doc.mimeType,
      documentType: doc.documentType,
    });

    return doc;
  }

  async reviewDocument(
    tenantId: string,
    userId: string,
    documentId: string,
    correctedData: Record<string, unknown> | undefined,
    t: Translator,
  ): Promise<ReviewDocumentResult> {
    const doc = await ocrRepository.findById(tenantId, documentId);
    if (!doc) {
      throw new NotFoundError(t("ocr.not_found"));
    }
    if (doc.status !== OcrDocumentStatus.COMPLETED) {
      throw new BadRequestError(t("ocr.not_completed"));
    }
    if (doc.reviewedAt !== null) {
      throw new ConflictError(t("ocr.already_reviewed"));
    }

    // Save the review (with optional corrections)
    const reviewed = await ocrRepository.updateReview(
      documentId,
      userId,
      correctedData as Prisma.InputJsonValue | undefined,
    );

    // ── Auto-create supplier from invoice extraction (best-effort, non-blocking) ─
    let autoCreatedSupplier: AutoCreatedSupplier | null = null;

    if (doc.documentType === OcrDocumentType.INVOICE) {
      // Use correctedData if provided (reviewer may have fixed the supplier name),
      // otherwise fall back to the original extractedData
      const effectiveData = (correctedData ?? doc.extractedData) as InvoiceExtractedData | null;
      const supplierName = effectiveData?.supplierName?.trim();

      if (supplierName) {
        try {
          const { supplier, created } = await suppliersRepository.findOrCreateByName(tenantId, {
            nameEn: supplierName,   // placeholder — user can correct English name later
            nameAr: supplierName,
            taxId:  effectiveData?.supplierTaxId?.trim() ?? null,
          });

          autoCreatedSupplier = {
            id:      supplier.id,
            nameEn:  supplier.nameEn,
            nameAr:  supplier.nameAr,
            taxId:   supplier.taxId,
            created,
          };
        } catch (err) {
          // Supplier creation is best-effort — never fail the review over it
          logger.warn("ocr.review: failed to auto-create supplier", {
            tenantId,
            documentId,
            supplierName,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    return { doc: reviewed, autoCreatedSupplier };
  }
}

export const ocrService = new OcrService();
