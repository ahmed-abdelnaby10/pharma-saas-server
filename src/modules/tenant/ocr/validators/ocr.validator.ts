import { z } from "zod";
import { OcrDocumentStatus, OcrDocumentType } from "@prisma/client";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { QueryOcrDocumentsDto } from "../dto/query-ocr.dto";
import { ReviewOcrDto } from "../dto/review-ocr.dto";

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

const reviewBodySchema = z.object({
  correctedData: z.record(z.string(), z.unknown()).optional(),
});

const convertInvoiceSchema = z.object({
  branchId:            z.string().cuid().optional(),
  supplierId:          z.string().cuid().nullable().optional(),
  defaultSellingPrice: z.number().positive().optional(),
  markOrdered:         z.boolean().optional(),
});

const convertPrescriptionSchema = z.object({
  branchId:  z.string().cuid().optional(),
  patientId: z.string().cuid().optional(),
});

export type ConvertInvoiceBody      = z.infer<typeof convertInvoiceSchema>;
export type ConvertPrescriptionBody = z.infer<typeof convertPrescriptionSchema>;

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

export function parseReviewBody(body: unknown): ReviewOcrDto {
  const result = reviewBodySchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseConvertInvoiceBody(body: unknown): ConvertInvoiceBody {
  const result = convertInvoiceSchema.safeParse(body ?? {});
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseConvertPrescriptionBody(body: unknown): ConvertPrescriptionBody {
  const result = convertPrescriptionSchema.safeParse(body ?? {});
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}
