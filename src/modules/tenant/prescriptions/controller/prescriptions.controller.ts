import { Request, Response } from "express";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { prescriptionsService } from "../service/prescriptions.service";
import { mapPrescriptionResponse } from "../mapper/prescriptions.mapper";
import {
  parseCreatePrescriptionDto,
  parseUpdatePrescriptionDto,
  parseDispensePrescriptionDto,
  parseQueryPrescriptionsDto,
  parsePrescriptionIdParam,
} from "../validators/prescriptions.validator";

class PrescriptionsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryPrescriptionsDto(req.query);
    const prescriptions = await prescriptionsService.listPrescriptions(auth, query);
    res.json({ success: true, data: prescriptions.map(mapPrescriptionResponse) });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const prescriptionId = parsePrescriptionIdParam(req.params);
    const prescription = await prescriptionsService.getPrescription(auth, prescriptionId);
    res.json({ success: true, data: mapPrescriptionResponse(prescription) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const dto = parseCreatePrescriptionDto(req.body);
    const prescription = await prescriptionsService.createPrescription(auth, dto);
    res.status(201).json({ success: true, data: mapPrescriptionResponse(prescription) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const prescriptionId = parsePrescriptionIdParam(req.params);
    const dto = parseUpdatePrescriptionDto(req.body);
    const prescription = await prescriptionsService.updatePrescription(auth, prescriptionId, dto);
    res.json({ success: true, data: mapPrescriptionResponse(prescription) });
  };

  dispense = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const prescriptionId = parsePrescriptionIdParam(req.params);
    const dto = parseDispensePrescriptionDto(req.body);
    const prescription = await prescriptionsService.dispensePrescription(auth, prescriptionId, dto);
    res.json({ success: true, data: mapPrescriptionResponse(prescription) });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const prescriptionId = parsePrescriptionIdParam(req.params);
    const prescription = await prescriptionsService.cancelPrescription(auth, prescriptionId);
    res.json({ success: true, data: mapPrescriptionResponse(prescription) });
  };
}

export const prescriptionsController = new PrescriptionsController();
