import { z } from "zod";
import { OcrDocumentStatus, OcrDocumentType } from "@prisma/client";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { QueryOcrDocumentsDto } from "../dto/query-ocr.dto";

const queryOcrSchema = z.object({
  branchId: z.string().cuid(),
  documentType: z.nativeEnum(OcrDocumentType).optional(),
  status: z.nativeEnum(OcrDocumentStatus).optional(),
});

const uploadBodySchema = z.object({
  branchId: z.string().cuid(),
  documentType: z.nativeEnum(OcrDocumentType),
});

const documentIdSchema = z.object({ documentId: z.string().cuid() });

export function parseQueryOcrDocuments(query: unknown): QueryOcrDocumentsDto {
  const result = queryOcrSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseUploadBody(body: unknown): { branchId: string; documentType: OcrDocumentType } {
  const result = uploadBodySchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseDocumentIdParam(params: unknown): string {
  const result = documentIdSchema.safeParse(params);
  if (!result.success) {
    throw new BadRequestError("Invalid document ID");
  }
  return result.data.documentId;
}
