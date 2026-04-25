import { Request, Response } from "express";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { patientsService } from "../service/patients.service";
import { mapPatientResponse } from "../mapper/patients.mapper";
import {
  parseCreatePatientDto,
  parseUpdatePatientDto,
  parseQueryPatientsDto,
  parsePatientIdParam,
} from "../validators/patients.validator";

class PatientsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryPatientsDto(req.query);
    const patients = await patientsService.listPatients(auth, query);
    res.json({ success: true, data: patients.map(mapPatientResponse) });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const patientId = parsePatientIdParam(req.params);
    const patient = await patientsService.getPatient(auth, patientId);
    res.json({ success: true, data: mapPatientResponse(patient) });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const dto = parseCreatePatientDto(req.body);
    const patient = await patientsService.createPatient(auth, dto);
    res.status(201).json({ success: true, data: mapPatientResponse(patient) });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const patientId = parsePatientIdParam(req.params);
    const dto = parseUpdatePatientDto(req.body);
    const patient = await patientsService.updatePatient(auth, patientId, dto);
    res.json({ success: true, data: mapPatientResponse(patient) });
  };

  deactivate = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const patientId = parsePatientIdParam(req.params);
    const patient = await patientsService.deactivatePatient(auth, patientId);
    res.json({ success: true, data: mapPatientResponse(patient) });
  };
}

export const patientsController = new PatientsController();
