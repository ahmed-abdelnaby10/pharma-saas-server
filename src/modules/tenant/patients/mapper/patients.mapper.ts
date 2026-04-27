import { Patient } from "@prisma/client";

export type PatientRecord = Patient;

export function mapPatientResponse(p: PatientRecord) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    fullName: p.fullName,
    dateOfBirth: p.dateOfBirth,
    phone: p.phone,
    email: p.email,
    nationalId: p.nationalId,
    gender: p.gender,
    notes: p.notes,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
