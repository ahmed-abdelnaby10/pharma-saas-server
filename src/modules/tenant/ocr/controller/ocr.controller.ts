import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { parseQueryOcrDocuments, parseUploadBody, parseDocumentIdParam, parseReviewBody } from "../validators/ocr.validator";
import { mapOcrDocumentResponse } from "../mapper/ocr.mapper";
import { ocrService, OcrService } from "../service/ocr.service";

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
    const doc = await this.service.reviewDocument(
      auth.tenantId,
      auth.userId,
      documentId,
      correctedData,
      req.t!,
    );
    return res.status(200).json(
      successResponse(
        req.t?.("ocr.reviewed") || "Document reviewed",
        mapOcrDocumentResponse(doc),
        undefined,
        req.requestId,
      ),
    );
  };
}

export const ocrController = new OcrController(ocrService);
