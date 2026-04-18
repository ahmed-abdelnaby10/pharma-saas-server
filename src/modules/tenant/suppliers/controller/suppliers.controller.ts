import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseCreateSupplierDto,
  parseUpdateSupplierDto,
  parseQuerySuppliersDto,
  parseSupplierIdParam,
} from "../validators/suppliers.validator";
import { mapSupplierResponse } from "../mapper/suppliers.mapper";
import { suppliersService, SuppliersService } from "../service/suppliers.service";

export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

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
}

export const suppliersController = new SuppliersController(suppliersService);
