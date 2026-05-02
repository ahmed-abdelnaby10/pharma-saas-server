import { OcrDocumentStatus, OcrDocumentType } from "@prisma/client";

export interface QueryOcrDocumentsDto {
  branchId: string;
  documentType?: OcrDocumentType;
  status?: OcrDocumentStatus;
}
