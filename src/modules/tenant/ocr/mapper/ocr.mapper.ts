import { OcrDocument, OcrDocumentStatus, OcrDocumentType } from "@prisma/client";

export type OcrDocumentRecord = OcrDocument;

export interface OcrDocumentResponse {
  id: string;
  tenantId: string;
  branchId: string;
  documentType: OcrDocumentType;
  status: OcrDocumentStatus;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  errorMessage: string | null;
  extractedData: unknown;
  reviewedAt: Date | null;
  reviewedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapOcrDocumentResponse(doc: OcrDocumentRecord): OcrDocumentResponse {
  return {
    id: doc.id,
    tenantId: doc.tenantId,
    branchId: doc.branchId,
    documentType: doc.documentType,
    status: doc.status,
    fileName: doc.fileName,
    filePath: doc.filePath,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    errorMessage: doc.errorMessage,
    extractedData: doc.extractedData,
    reviewedAt: doc.reviewedAt,
    reviewedById: doc.reviewedById,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
