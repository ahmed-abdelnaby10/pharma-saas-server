import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { parseCreateSale, parseQuerySales, parseSaleIdParam } from "../validators/pos.validator";
import { mapSaleResponse, mapReceiptResponse } from "../mapper/pos.mapper";
import { posService, PosService } from "../service/pos.service";

export class PosController {
  constructor(private readonly service: PosService) {}

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQuerySales(req.query);
    const sales = await this.service.listSales(auth.tenantId, query, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        sales.map(mapSaleResponse),
        undefined,
        req.requestId,
      ),
    );
  };

  get = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const saleId = parseSaleIdParam(req.params);
    const sale = await this.service.getSale(auth.tenantId, saleId, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        mapSaleResponse(sale),
        undefined,
        req.requestId,
      ),
    );
  };

  receipt = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const saleId = parseSaleIdParam(req.params);
    const { sale, branding } = await this.service.getReceipt(auth.tenantId, saleId, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        mapReceiptResponse(sale, branding),
        undefined,
        req.requestId,
      ),
    );
  };

  create = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const payload = parseCreateSale(req.body);
    const sale = await this.service.createSale(
      auth.tenantId,
      auth.userId,
      payload,
      req.t!,
    );
    return res.status(201).json(
      successResponse(
        req.t?.("sale.created") || "Sale created",
        mapSaleResponse(sale),
        undefined,
        req.requestId,
      ),
    );
  };
}

export const posController = new PosController(posService);
