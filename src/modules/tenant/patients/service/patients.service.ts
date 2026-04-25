import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { CreatePatientDto } from "../dto/create-patient.dto";
import { UpdatePatientDto } from "../dto/update-patient.dto";
import { QueryPatientsDto } from "../dto/query-patients.dto";
import { PatientRecord } from "../mapper/patients.mapper";
import { patientsRepository } from "../repository/patients.repository";

export class PatientsService {
  async listPatients(auth: TenantAuthContext, query: QueryPatientsDto): Promise<PatientRecord[]> {
    return patientsRepository.list(auth.tenantId, query);
  }

  async getPatient(auth: TenantAuthContext, patientId: string): Promise<PatientRecord> {
    const patient = await patientsRepository.findById(auth.tenantId, patientId);
    if (!patient) {
      throw new NotFoundError("Patient not found", undefined, "patient.not_found");
    }
    return patient;
  }

  async createPatient(auth: TenantAuthContext, payload: CreatePatientDto): Promise<PatientRecord> {
    if (payload.nationalId) {
      const existing = await patientsRepository.findByNationalId(
        auth.tenantId,
        payload.nationalId,
      );
      if (existing) {
        throw new ConflictError(
          "A patient with this national ID already exists",
          undefined,
          "patient.national_id_conflict",
        );
      }
    }

    return patientsRepository.create({
      tenantId: auth.tenantId,
      fullName: payload.fullName,
      dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      nationalId: payload.nationalId ?? null,
      gender: payload.gender ?? null,
      notes: payload.notes ?? null,
    });
  }

  async updatePatient(
    auth: TenantAuthContext,
    patientId: string,
    payload: UpdatePatientDto,
  ): Promise<PatientRecord> {
    const patient = await patientsRepository.findById(auth.tenantId, patientId);
    if (!patient) {
      throw new NotFoundError("Patient not found", undefined, "patient.not_found");
    }

    if (payload.nationalId !== undefined && payload.nationalId !== patient.nationalId) {
      if (payload.nationalId !== null) {
        const conflict = await patientsRepository.findByNationalId(
          auth.tenantId,
          payload.nationalId,
        );
        if (conflict) {
          throw new ConflictError(
            "A patient with this national ID already exists",
            undefined,
            "patient.national_id_conflict",
          );
        }
      }
    }

    return patientsRepository.update(patientId, {
      fullName: payload.fullName,
      dateOfBirth: payload.dateOfBirth !== undefined
        ? payload.dateOfBirth ? new Date(payload.dateOfBirth) : null
        : undefined,
      phone: payload.phone,
      email: payload.email,
      nationalId: payload.nationalId,
      gender: payload.gender,
      notes: payload.notes,
    });
  }

  async deactivatePatient(auth: TenantAuthContext, patientId: string): Promise<PatientRecord> {
    const patient = await patientsRepository.findById(auth.tenantId, patientId);
    if (!patient) {
      throw new NotFoundError("Patient not found", undefined, "patient.not_found");
    }
    if (!patient.isActive) {
      throw new ConflictError("Patient is already inactive", undefined, "patient.already_inactive");
    }
    return patientsRepository.deactivate(patientId);
  }
}

export const patientsService = new PatientsService();
