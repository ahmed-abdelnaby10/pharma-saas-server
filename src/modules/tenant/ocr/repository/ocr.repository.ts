import { OcrDocumentStatus, OcrDocumentType, Prisma } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { QueryOcrDocumentsDto } from "../dto/query-ocr.dto";
import { OcrDocumentRecord } from "../mapper/ocr.mapper";

export class OcrRepository {
  async list(tenantId: string, query: QueryOcrDocumentsDto): Promise<OcrDocumentRecord[]> {
    return prisma.ocrDocument.findMany({
      where: {
        tenantId,
        branchId: query.branchId,
        ...(query.documentType ? { documentType: query.documentType } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async findById(tenantId: string, documentId: string): Promise<OcrDocumentRecord | null> {
    return prisma.ocrDocument.findFirst({
      where: { id: documentId, tenantId },
    });
  }

  async create(data: {
    tenantId: string;
    branchId: string;
    documentType: OcrDocumentType;
    fileName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
  }): Promise<OcrDocumentRecord> {
    return prisma.ocrDocument.create({ data });
  }

  async updateStatus(
    documentId: string,
    status: OcrDocumentStatus,
    errorMessage?: string | null,
  ): Promise<OcrDocumentRecord> {
    return prisma.ocrDocument.update({
      where: { id: documentId },
      data: {
        status,
        ...(errorMessage !== undefined ? { errorMessage } : {}),
      },
    });
  }

  async updateExtractedData(
    documentId: string,
    extractedData: Prisma.InputJsonValue,
  ): Promise<OcrDocumentRecord> {
    return prisma.ocrDocument.update({
      where: { id: documentId },
      data: {
        extractedData,
        status: OcrDocumentStatus.COMPLETED,
      },
    });
  }
}

export const ocrRepository = new OcrRepository();
