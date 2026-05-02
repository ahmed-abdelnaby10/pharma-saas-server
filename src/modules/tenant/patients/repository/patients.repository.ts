import { prisma } from "../../../../core/db/prisma";
import { PatientRecord } from "../mapper/patients.mapper";
import { CreatePatientDto, QueryPatientsDto, UpdatePatientDto } from "../validators/patients.validator";

export class PatientsRepository {
  async findById(tenantId: string, patientId: string): Promise<PatientRecord | null> {
    return prisma.patient.findFirst({ where: { id: patientId, tenantId } });
  }

  async findByNationalId(tenantId: string, nationalId: string): Promise<PatientRecord | null> {
    return prisma.patient.findUnique({
      where: { tenantId_nationalId: { tenantId, nationalId } },
    });
  }

  async list(tenantId: string, query: QueryPatientsDto): Promise<PatientRecord[]> {
    return prisma.patient.findMany({
      where: {
        tenantId,
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        ...(query.search
          ? {
              OR: [
                { fullName:   { contains: query.search, mode: "insensitive" } },
                { phone:      { contains: query.search, mode: "insensitive" } },
                { email:      { contains: query.search, mode: "insensitive" } },
                { nationalId: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ fullName: "asc" }],
    });
  }

  async create(tenantId: string, payload: CreatePatientDto): Promise<PatientRecord> {
    return prisma.patient.create({
      data: {
        tenantId,
        fullName: payload.fullName,
        dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
        phone: payload.phone ?? null,
        email: payload.email ?? null,
        nationalId: payload.nationalId ?? null,
        gender: payload.gender ?? null,
        notes: payload.notes ?? null,
      },
    });
  }

  async update(tenantId: string, patientId: string, payload: UpdatePatientDto): Promise<PatientRecord> {
    return prisma.patient.update({
      where: { id: patientId },
      data: {
        ...(payload.fullName !== undefined    ? { fullName: payload.fullName } : {}),
        ...(payload.dateOfBirth !== undefined ? { dateOfBirth: new Date(payload.dateOfBirth) } : {}),
        ...(payload.phone !== undefined       ? { phone: payload.phone } : {}),
        ...(payload.email !== undefined       ? { email: payload.email } : {}),
        ...(payload.nationalId !== undefined  ? { nationalId: payload.nationalId } : {}),
        ...(payload.gender !== undefined      ? { gender: payload.gender } : {}),
        ...(payload.notes !== undefined       ? { notes: payload.notes } : {}),
      },
    });
  }

  async deactivate(tenantId: string, patientId: string): Promise<PatientRecord> {
    return prisma.patient.update({ where: { id: patientId }, data: { isActive: false } });
  }
}

export const patientsRepository = new PatientsRepository();
