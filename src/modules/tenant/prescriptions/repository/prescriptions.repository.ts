import { Prisma, PrescriptionStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { PrescriptionRecord } from "../mapper/prescriptions.mapper";
import { QueryPrescriptionsDto } from "../dto/query-prescriptions.dto";

const prescriptionInclude = {
  items: true,
} satisfies Prisma.PrescriptionInclude;

export class PrescriptionsRepository {
  async list(tenantId: string, query: QueryPrescriptionsDto): Promise<PrescriptionRecord[]> {
    const where: Prisma.PrescriptionWhereInput = {
      tenantId,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { prescriptionNumber: { contains: query.search, mode: "insensitive" } },
              { doctorName: { contains: query.search, mode: "insensitive" } },
              { doctorLicense: { contains: query.search, mode: "insensitive" } },
              { items: { some: { drugName: { contains: query.search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    return prisma.prescription.findMany({
      where,
      include: prescriptionInclude,
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async findById(tenantId: string, prescriptionId: string): Promise<PrescriptionRecord | null> {
    return prisma.prescription.findFirst({
      where: { id: prescriptionId, tenantId },
      include: prescriptionInclude,
    });
  }

  async findBySaleId(tenantId: string, saleId: string): Promise<PrescriptionRecord | null> {
    return prisma.prescription.findFirst({
      where: { saleId, tenantId },
      include: prescriptionInclude,
    });
  }

  async create(
    tenantId: string,
    data: {
      branchId: string;
      patientId?: string | null;
      prescriptionNumber?: string | null;
      doctorName?: string | null;
      doctorLicense?: string | null;
      issuedAt?: Date | null;
      notes?: string | null;
      items: Array<{ drugName: string; quantity: Prisma.Decimal; dosageInstructions?: string | null }>;
    },
  ): Promise<PrescriptionRecord> {
    return prisma.prescription.create({
      data: {
        tenantId,
        branchId: data.branchId,
        ...(data.patientId != null ? { patientId: data.patientId } : {}),
        ...(data.prescriptionNumber != null ? { prescriptionNumber: data.prescriptionNumber } : {}),
        ...(data.doctorName != null ? { doctorName: data.doctorName } : {}),
        ...(data.doctorLicense != null ? { doctorLicense: data.doctorLicense } : {}),
        ...(data.issuedAt != null ? { issuedAt: data.issuedAt } : {}),
        ...(data.notes != null ? { notes: data.notes } : {}),
        items: {
          create: data.items.map((item) => ({
            drugName: item.drugName,
            quantity: item.quantity,
            ...(item.dosageInstructions != null
              ? { dosageInstructions: item.dosageInstructions }
              : {}),
          })),
        },
      },
      include: prescriptionInclude,
    });
  }

  async update(
    prescriptionId: string,
    data: {
      patientId?: string | null;
      prescriptionNumber?: string | null;
      doctorName?: string | null;
      doctorLicense?: string | null;
      issuedAt?: Date | null;
      notes?: string | null;
      items?: Array<{ drugName: string; quantity: Prisma.Decimal; dosageInstructions?: string | null }>;
    },
  ): Promise<PrescriptionRecord> {
    const { items, ...rest } = data;

    if (items !== undefined) {
      // Replace items: delete old, insert new within a transaction
      return prisma.$transaction(async (tx) => {
        await tx.prescriptionItem.deleteMany({ where: { prescriptionId } });
        return tx.prescription.update({
          where: { id: prescriptionId },
          data: {
            ...rest,
            items: {
              create: items.map((item) => ({
                drugName: item.drugName,
                quantity: item.quantity,
                ...(item.dosageInstructions != null
                  ? { dosageInstructions: item.dosageInstructions }
                  : {}),
              })),
            },
          },
          include: prescriptionInclude,
        });
      });
    }

    return prisma.prescription.update({
      where: { id: prescriptionId },
      data: rest,
      include: prescriptionInclude,
    });
  }

  async dispense(
    prescriptionId: string,
    saleId: string,
  ): Promise<PrescriptionRecord> {
    return prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        saleId,
        status: PrescriptionStatus.DISPENSED,
        dispensedAt: new Date(),
      },
      include: prescriptionInclude,
    });
  }

  async cancel(prescriptionId: string): Promise<PrescriptionRecord> {
    return prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: PrescriptionStatus.CANCELLED },
      include: prescriptionInclude,
    });
  }
}

export const prescriptionsRepository = new PrescriptionsRepository();
