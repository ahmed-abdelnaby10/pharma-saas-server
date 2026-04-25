import { Gender, Patient } from "@prisma/client";

export type PatientRecord = Patient;

export interface PatientResponse {
  id: string;
  tenantId: string;
  fullName: string;
  dateOfBirth: Date | null;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  gender: Gender | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function mapPatientResponse(p: PatientRecord): PatientResponse {
  return {
    id: p.id,
    tenantId: p.tenantId,
    fullName: p.fullName,
    dateOfBirth: p.dateOfBirth ?? null,
    phone: p.phone ?? null,
    email: p.email ?? null,
    nationalId: p.nationalId ?? null,
    gender: p.gender ?? null,
    notes: p.notes ?? null,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
