import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseQueryOcrDocuments,
  parseUploadBody,
  parseDocumentIdParam,
  parseReviewBody,
  parseConvertInvoiceBody,
  parseConvertPrescriptionBody,
} from "../validators/ocr.validator";
import { mapOcrDocumentResponse } from "../mapper/ocr.mapper";
import { ocrService, OcrService } from "../service/ocr.service";
import { ocrConversionService } from "../service/ocr-conversion.service";
import { mapPurchaseOrderResponse } from "../../purchasing/mapper/purchasing.mapper";
import { mapPrescriptionResponse } from "../../prescriptions/mapper/prescriptions.mapper";

export class OcrController {
  constructor(private readonly service: OcrService) {}

  listDocuments = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryOcrDocuments(req.query);
    const docs = await this.service.listDocuments(auth.tenantId, query, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        docs.map(mapOcrDocumentResponse),
        { count: docs.length },
        req.requestId,
      ),
    );
  };

  getDocument = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const documentId = parseDocumentIdParam(req.params);
    const doc = await this.service.getDocument(auth.tenantId, documentId, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        mapOcrDocumentResponse(doc),
        undefined,
        req.requestId,
      ),
    );
  };

  uploadDocument = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const { branchId, documentType } = parseUploadBody(req.body);
    const doc = await this.service.uploadDocument(
      auth.tenantId,
      branchId,
      documentType,
      req.file!,
      req.t!,
    );
    return res.status(201).json(
      successResponse(
        req.t?.("ocr.uploaded") || "Document uploaded",
        mapOcrDocumentResponse(doc),
        undefined,
        req.requestId,
      ),
    );
  };

  processDocument = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const documentId = parseDocumentIdParam(req.params);
    const doc = await this.service.triggerProcessing(auth.tenantId, auth.userId, documentId, req.t!);
    return res.status(202).json(
      successResponse(
        req.t?.("ocr.processing_started") || "Processing started",
        mapOcrDocumentResponse(doc),
        undefined,
        req.requestId,
      ),
    );
  };

  reviewDocument = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const documentId = parseDocumentIdParam(req.params);
    const { correctedData } = parseReviewBody(req.body);
    const { doc, autoCreatedSupplier } = await this.service.reviewDocument(
      auth.tenantId,
      auth.userId,
      documentId,
      correctedData,
      req.t!,
    );
    return res.status(200).json(
      successResponse(
        req.t?.("ocr.reviewed") || "Document reviewed",
        {
          ...mapOcrDocumentResponse(doc),
          autoCreatedSupplier,   // null for prescriptions; { id, nameEn, nameAr, taxId, created } for invoices
        },
        undefined,
        req.requestId,
      ),
    );
  };

  // ── Conversions ──────────────────────────────────────────────────────────

  toPurchaseOrder = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const documentId = parseDocumentIdParam(req.params);
    const opts = parseConvertInvoiceBody(req.body);
    const result = await ocrConversionService.convertInvoiceToPurchaseOrder(
      auth,
      documentId,
      opts,
      req.t!,
    );
    return res.status(result.alreadyConverted ? 200 : 201).json(
      successResponse(
        result.alreadyConverted
          ? req.t?.("ocr.already_converted") || "Invoice already converted"
          : req.t?.("ocr.converted_to_po") || "Purchase order created from invoice",
        {
          purchaseOrder:    mapPurchaseOrderResponse(result.purchaseOrder),
          resolution:       result.resolution,
          alreadyConverted: result.alreadyConverted,
        },
        undefined,
        req.requestId,
      ),
    );
  };

  toPrescription = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const documentId = parseDocumentIdParam(req.params);
    const opts = parseConvertPrescriptionBody(req.body);
    const rx = await ocrConversionService.convertOcrToPrescription(
      auth,
      documentId,
      opts,
      req.t!,
    );
    return res.status(201).json(
      successResponse(
        req.t?.("ocr.converted_to_prescription") || "Prescription created from document",
        mapPrescriptionResponse(rx),
        undefined,
        req.requestId,
      ),
    );
  };
}

export const ocrController = new OcrController(ocrService);
