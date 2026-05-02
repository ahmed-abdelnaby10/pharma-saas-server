import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import {
  parseCreateInvoiceDto,
  parseQueryInvoicesDto,
  parseInvoiceIdParam,
} from "../validators/invoices.validator";
import { mapInvoiceResponse } from "../mapper/invoices.mapper";
import { invoicesService, InvoicesService } from "../service/invoices.service";

export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  list = async (req: Request, res: Response) => {
    const query = parseQueryInvoicesDto(req.query);
    const invoices = await this.service.listInvoices(query, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        invoices.map(mapInvoiceResponse),
        { count: invoices.length },
        req.requestId,
      ),
    );
  };

  getById = async (req: Request, res: Response) => {
    const invoiceId = parseInvoiceIdParam(req.params);
    const inv = await this.service.getInvoice(invoiceId, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        mapInvoiceResponse(inv),
        undefined,
        req.requestId,
      ),
    );
  };

  create = async (req: Request, res: Response) => {
    const data = parseCreateInvoiceDto(req.body);
    const inv = await this.service.createInvoice(data, req.t!);
    return res.status(201).json(
      successResponse(
        req.t?.("invoice.created") || "Invoice created",
        mapInvoiceResponse(inv),
        undefined,
        req.requestId,
      ),
    );
  };

  issue = async (req: Request, res: Response) => {
    const invoiceId = parseInvoiceIdParam(req.params);
    const inv = await this.service.issueInvoice(invoiceId, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("invoice.issued") || "Invoice issued",
        mapInvoiceResponse(inv),
        undefined,
        req.requestId,
      ),
    );
  };

  markPaid = async (req: Request, res: Response) => {
    const invoiceId = parseInvoiceIdParam(req.params);
    const inv = await this.service.markPaid(invoiceId, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("invoice.paid") || "Invoice marked as paid",
        mapInvoiceResponse(inv),
        undefined,
        req.requestId,
      ),
    );
  };

  void = async (req: Request, res: Response) => {
    const invoiceId = parseInvoiceIdParam(req.params);
    const inv = await this.service.voidInvoice(invoiceId, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("invoice.voided") || "Invoice voided",
        mapInvoiceResponse(inv),
        undefined,
        req.requestId,
      ),
    );
  };
}

export const invoicesController = new InvoicesController(invoicesService);
