import { Prisma, PrescriptionStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { PrescriptionWithItems } from "../mapper/prescriptions.mapper";
import {
  CreatePrescriptionDto,
  QueryPrescriptionsDto,
  UpdatePrescriptionDto,
} from "../validators/prescriptions.validator";

const INCLUDE_ITEMS = { items: true } as const;

export class PrescriptionsRepository {
  async findById(tenantId: string, prescriptionId: string): Promise<PrescriptionWithItems | null> {
    return prisma.prescription.findFirst({
      where: { id: prescriptionId, tenantId },
      include: INCLUDE_ITEMS,
    });
  }

  async findBySaleId(tenantId: string, saleId: string): Promise<PrescriptionWithItems | null> {
    return prisma.prescription.findFirst({
      where: { saleId, tenantId },
      include: INCLUDE_ITEMS,
    });
  }

  async list(tenantId: string, query: QueryPrescriptionsDto): Promise<PrescriptionWithItems[]> {
    const where: Prisma.PrescriptionWhereInput = { tenantId };

    if (query.branchId)  where.branchId  = query.branchId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.status)    where.status    = query.status;

    if (query.search) {
      where.OR = [
        { prescriptionNumber: { contains: query.search, mode: "insensitive" } },
        { doctorName:         { contains: query.search, mode: "insensitive" } },
        { doctorLicense:      { contains: query.search, mode: "insensitive" } },
        { items: { some: { drugName: { contains: query.search, mode: "insensitive" } } } },
      ];
    }

    return prisma.prescription.findMany({
      where,
      include: INCLUDE_ITEMS,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(tenantId: string, payload: CreatePrescriptionDto): Promise<PrescriptionWithItems> {
    return prisma.prescription.create({
      data: {
        tenantId,
        branchId: payload.branchId,
        patientId: payload.patientId ?? null,
        prescriptionNumber: payload.prescriptionNumber ?? null,
        doctorName: payload.doctorName ?? null,
        doctorLicense: payload.doctorLicense ?? null,
        issuedAt: payload.issuedAt ? new Date(payload.issuedAt) : null,
        notes: payload.notes ?? null,
        items: {
          create: payload.items.map((item) => ({
            drugName: item.drugName,
            quantity: new Prisma.Decimal(item.quantity),
            dosageInstructions: item.dosageInstructions ?? null,
          })),
        },
      },
      include: INCLUDE_ITEMS,
    });
  }

  async update(
    tenantId: string,
    prescriptionId: string,
    payload: UpdatePrescriptionDto,
  ): Promise<PrescriptionWithItems> {
    return prisma.$transaction(async (tx) => {
      // Replace items if provided
      if (payload.items) {
        await tx.prescriptionItem.deleteMany({ where: { prescriptionId } });
        await tx.prescriptionItem.createMany({
          data: payload.items.map((item) => ({
            prescriptionId,
            drugName: item.drugName,
            quantity: new Prisma.Decimal(item.quantity),
            dosageInstructions: item.dosageInstructions ?? null,
          })),
        });
      }

      return tx.prescription.update({
        where: { id: prescriptionId },
        data: {
          ...(payload.patientId !== undefined       ? { patientId: payload.patientId }        : {}),
          ...(payload.prescriptionNumber !== undefined ? { prescriptionNumber: payload.prescriptionNumber } : {}),
          ...(payload.doctorName !== undefined      ? { doctorName: payload.doctorName }      : {}),
          ...(payload.doctorLicense !== undefined   ? { doctorLicense: payload.doctorLicense } : {}),
          ...(payload.issuedAt !== undefined        ? { issuedAt: new Date(payload.issuedAt) } : {}),
          ...(payload.notes !== undefined           ? { notes: payload.notes }                : {}),
        },
        include: INCLUDE_ITEMS,
      });
    });
  }

  async dispense(
    prescriptionId: string,
    saleId: string,
  ): Promise<PrescriptionWithItems> {
    return prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        saleId,
        status: PrescriptionStatus.DISPENSED,
        dispensedAt: new Date(),
      },
      include: INCLUDE_ITEMS,
    });
  }

  async cancel(prescriptionId: string): Promise<PrescriptionWithItems> {
    return prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: PrescriptionStatus.CANCELLED },
      include: INCLUDE_ITEMS,
    });
  }
}

export const prescriptionsRepository = new PrescriptionsRepository();
