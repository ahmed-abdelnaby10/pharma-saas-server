import { Gender, Prisma } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { QueryPatientsDto } from "../dto/query-patients.dto";
import { PatientRecord } from "../mapper/patients.mapper";

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
    const where: Prisma.PatientWhereInput = {
      tenantId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" } },
              { phone: { contains: query.search, mode: "insensitive" } },
              { nationalId: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return prisma.patient.findMany({ where, orderBy: [{ fullName: "asc" }] });
  }

  async create(data: {
    tenantId: string;
    fullName: string;
    dateOfBirth?: Date | null;
    phone?: string | null;
    email?: string | null;
    nationalId?: string | null;
    gender?: Gender | null;
    notes?: string | null;
  }): Promise<PatientRecord> {
    return prisma.patient.create({
      data: {
        tenantId: data.tenantId,
        fullName: data.fullName,
        ...(data.dateOfBirth !== undefined ? { dateOfBirth: data.dateOfBirth } : {}),
        ...(data.phone != null ? { phone: data.phone } : {}),
        ...(data.email != null ? { email: data.email } : {}),
        ...(data.nationalId != null ? { nationalId: data.nationalId } : {}),
        ...(data.gender != null ? { gender: data.gender } : {}),
        ...(data.notes != null ? { notes: data.notes } : {}),
      },
    });
  }

  async update(
    patientId: string,
    data: {
      fullName?: string;
      dateOfBirth?: Date | null;
      phone?: string | null;
      email?: string | null;
      nationalId?: string | null;
      gender?: Gender | null;
      notes?: string | null;
    },
  ): Promise<PatientRecord> {
    return prisma.patient.update({
      where: { id: patientId },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.dateOfBirth !== undefined ? { dateOfBirth: data.dateOfBirth } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.nationalId !== undefined ? { nationalId: data.nationalId } : {}),
        ...(data.gender !== undefined ? { gender: data.gender } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
  }

  async deactivate(patientId: string): Promise<PatientRecord> {
    return prisma.patient.update({ where: { id: patientId }, data: { isActive: false } });
  }
}

export const patientsRepository = new PatientsRepository();
