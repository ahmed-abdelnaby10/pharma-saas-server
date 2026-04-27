import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseCreatePrescription,
  parseUpdatePrescription,
  parseQueryPrescriptions,
  parseDispense,
  parsePrescriptionIdParam,
} from "../validators/prescriptions.validator";
import { mapPrescriptionResponse } from "../mapper/prescriptions.mapper";
import { prescriptionsService, PrescriptionsService } from "../service/prescriptions.service";

export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryPrescriptions(req.query);
    const rxs = await this.service.list(auth.tenantId, query);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        rxs.map(mapPrescriptionResponse),
        { count: rxs.length },
        req.requestId,
      ),
    );
  };

  getById = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const prescriptionId = parsePrescriptionIdParam(req.params);
    const rx = await this.service.getById(auth.tenantId, prescriptionId, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", mapPrescriptionResponse(rx), undefined, req.requestId),
    );
  };

  create = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const payload = parseCreatePrescription(req.body);
    const rx = await this.service.create(auth.tenantId, payload, req.t!);
    return res.status(201).json(
      successResponse(req.t?.("prescription.created") || "Prescription created", mapPrescriptionResponse(rx), undefined, req.requestId),
    );
  };

  update = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const prescriptionId = parsePrescriptionIdParam(req.params);
    const payload = parseUpdatePrescription(req.body);
    const rx = await this.service.update(auth.tenantId, prescriptionId, payload, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("prescription.updated") || "Prescription updated", mapPrescriptionResponse(rx), undefined, req.requestId),
    );
  };

  dispense = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const prescriptionId = parsePrescriptionIdParam(req.params);
    const payload = parseDispense(req.body);
    const rx = await this.service.dispense(auth.tenantId, prescriptionId, payload, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("prescription.dispensed") || "Prescription dispensed", mapPrescriptionResponse(rx), undefined, req.requestId),
    );
  };

  cancel = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const prescriptionId = parsePrescriptionIdParam(req.params);
    const rx = await this.service.cancel(auth.tenantId, prescriptionId, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("prescription.cancelled") || "Prescription cancelled", mapPrescriptionResponse(rx), undefined, req.requestId),
    );
  };
}

export const prescriptionsController = new PrescriptionsController(prescriptionsService);
