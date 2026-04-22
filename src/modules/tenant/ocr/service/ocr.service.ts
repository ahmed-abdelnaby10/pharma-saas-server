import { OcrDocumentStatus, OcrDocumentType } from "@prisma/client";
import { Translator } from "../../../../shared/types/locale.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { ocrRepository } from "../repository/ocr.repository";
import { QueryOcrDocumentsDto } from "../dto/query-ocr.dto";
import { OcrDocumentRecord } from "../mapper/ocr.mapper";
import { toRelativePath } from "../upload/multer.config";
import { ocrQueue } from "../../../../core/queue/queues";

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
    documentId: string,
    t: Translator,
  ): Promise<OcrDocumentRecord> {
    const doc = await ocrRepository.findById(tenantId, documentId);
    if (!doc) {
      throw new NotFoundError(t("ocr.not_found"));
    }
    if (doc.documentType !== OcrDocumentType.INVOICE) {
      throw new BadRequestError(t("ocr.wrong_type_invoice"));
    }
    if (doc.status !== OcrDocumentStatus.PENDING) {
      throw new ConflictError(t("ocr.not_pending"));
    }

    await ocrQueue.add("process-invoice", {
      documentId: doc.id,
      tenantId: doc.tenantId,
      filePath: doc.filePath,
      mimeType: doc.mimeType,
      documentType: doc.documentType,
    });

    return doc;
  }
}

export const ocrService = new OcrService();
