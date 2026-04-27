import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { Translator } from "../../../../shared/types/locale.types";
import { PatientRecord } from "../mapper/patients.mapper";
import { patientsRepository, PatientsRepository } from "../repository/patients.repository";
import { CreatePatientDto, QueryPatientsDto, UpdatePatientDto } from "../validators/patients.validator";

export class PatientsService {
  constructor(private readonly repo: PatientsRepository) {}

  async list(tenantId: string, query: QueryPatientsDto): Promise<PatientRecord[]> {
    return this.repo.list(tenantId, query);
  }

  async getById(tenantId: string, patientId: string, t: Translator): Promise<PatientRecord> {
    const patient = await this.repo.findById(tenantId, patientId);
    if (!patient) throw new NotFoundError(t("patient.not_found"));
    return patient;
  }

  async create(tenantId: string, payload: CreatePatientDto, t: Translator): Promise<PatientRecord> {
    if (payload.nationalId) {
      const existing = await this.repo.findByNationalId(tenantId, payload.nationalId);
      if (existing) throw new ConflictError(t("patient.national_id_taken"));
    }
    return this.repo.create(tenantId, payload);
  }

  async update(
    tenantId: string,
    patientId: string,
    payload: UpdatePatientDto,
    t: Translator,
  ): Promise<PatientRecord> {
    const patient = await this.getById(tenantId, patientId, t);

    if (payload.nationalId && payload.nationalId !== patient.nationalId) {
      const existing = await this.repo.findByNationalId(tenantId, payload.nationalId);
      if (existing) throw new ConflictError(t("patient.national_id_taken"));
    }

    return this.repo.update(tenantId, patientId, payload);
  }

  async deactivate(tenantId: string, patientId: string, t: Translator): Promise<PatientRecord> {
    await this.getById(tenantId, patientId, t);
    return this.repo.deactivate(tenantId, patientId);
  }
}

export const patientsService = new PatientsService(patientsRepository);
