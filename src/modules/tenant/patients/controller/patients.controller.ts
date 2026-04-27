import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import {
  parseCreatePatient,
  parseUpdatePatient,
  parseQueryPatients,
  parsePatientIdParam,
} from "../validators/patients.validator";
import { mapPatientResponse } from "../mapper/patients.mapper";
import { patientsService, PatientsService } from "../service/patients.service";

export class PatientsController {
  constructor(private readonly service: PatientsService) {}

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryPatients(req.query);
    const patients = await this.service.list(auth.tenantId, query);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        patients.map(mapPatientResponse),
        { count: patients.length },
        req.requestId,
      ),
    );
  };

  getById = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const patientId = parsePatientIdParam(req.params);
    const patient = await this.service.getById(auth.tenantId, patientId, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", mapPatientResponse(patient), undefined, req.requestId),
    );
  };

  create = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const payload = parseCreatePatient(req.body);
    const patient = await this.service.create(auth.tenantId, payload, req.t!);
    return res.status(201).json(
      successResponse(req.t?.("patient.created") || "Patient created", mapPatientResponse(patient), undefined, req.requestId),
    );
  };

  update = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const patientId = parsePatientIdParam(req.params);
    const payload = parseUpdatePatient(req.body);
    const patient = await this.service.update(auth.tenantId, patientId, payload, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("patient.updated") || "Patient updated", mapPatientResponse(patient), undefined, req.requestId),
    );
  };

  deactivate = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const patientId = parsePatientIdParam(req.params);
    const patient = await this.service.deactivate(auth.tenantId, patientId, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("patient.deactivated") || "Patient deactivated", mapPatientResponse(patient), undefined, req.requestId),
    );
  };
}

export const patientsController = new PatientsController(patientsService);
