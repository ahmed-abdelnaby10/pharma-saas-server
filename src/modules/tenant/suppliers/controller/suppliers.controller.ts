import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseCreateSupplierDto,
  parseUpdateSupplierDto,
  parseQuerySuppliersDto,
  parseSupplierIdParam,
  parseCreatePaymentDto,
  parsePaymentIdParam,
} from "../validators/suppliers.validator";
import { mapSupplierResponse, mapPaymentResponse } from "../mapper/suppliers.mapper";
import { suppliersService, SuppliersService } from "../service/suppliers.service";

export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  // ── Supplier CRUD ────────────────────────────────────────────────────────────

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQuerySuppliersDto(req.query);
    const suppliers = await this.service.listSuppliers(auth, query);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", suppliers.map(mapSupplierResponse), undefined, req.requestId),
    );
  };

  get = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const supplierId = parseSupplierIdParam(req.params);
    const supplier = await this.service.getSupplier(auth, supplierId);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", mapSupplierResponse(supplier), undefined, req.requestId),
    );
  };

  create = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const payload = parseCreateSupplierDto(req.body);
    const supplier = await this.service.createSupplier(auth, payload);
    return res.status(201).json(
      successResponse(req.t?.("supplier.created") || "Supplier created", mapSupplierResponse(supplier), undefined, req.requestId),
    );
  };

  update = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const supplierId = parseSupplierIdParam(req.params);
    const payload = parseUpdateSupplierDto(req.body);
    const supplier = await this.service.updateSupplier(auth, supplierId, payload);
    return res.status(200).json(
      successResponse(req.t?.("supplier.updated") || "Supplier updated", mapSupplierResponse(supplier), undefined, req.requestId),
    );
  };

  deactivate = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const supplierId = parseSupplierIdParam(req.params);
    const supplier = await this.service.deactivateSupplier(auth, supplierId);
    return res.status(200).json(
      successResponse(req.t?.("supplier.deactivated") || "Supplier deactivated", mapSupplierResponse(supplier), undefined, req.requestId),
    );
  };

  // ── Financials ────────────────────────────────────────────────────────────────

  getFinancials = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const supplierId = parseSupplierIdParam(req.params);
    const financials = await this.service.getFinancials(auth, supplierId);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", financials, undefined, req.requestId),
    );
  };

  // ── Payments ─────────────────────────────────────────────────────────────────

  listPayments = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const supplierId = parseSupplierIdParam(req.params);
    const payments = await this.service.listPayments(auth, supplierId);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        payments.map(mapPaymentResponse),
        { count: payments.length },
        req.requestId,
      ),
    );
  };

  addPayment = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const supplierId = parseSupplierIdParam(req.params);
    const payload = parseCreatePaymentDto(req.body);
    const payment = await this.service.addPayment(auth, supplierId, payload);
    return res.status(201).json(
      successResponse(
        req.t?.("supplier.payment_recorded") || "Payment recorded",
        mapPaymentResponse(payment),
        undefined,
        req.requestId,
      ),
    );
  };

  deletePayment = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const { supplierId, paymentId } = parsePaymentIdParam(req.params);
    await this.service.deletePayment(auth, supplierId, paymentId);
    return res.status(200).json(
      successResponse(req.t?.("supplier.payment_voided") || "Payment voided", null, undefined, req.requestId),
    );
  };
}

export const suppliersController = new SuppliersController(suppliersService);
