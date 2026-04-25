import { Prisma, PrescriptionStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { prescriptionsRepository } from "../repository/prescriptions.repository";
import { PrescriptionRecord } from "../mapper/prescriptions.mapper";
import { CreatePrescriptionDto } from "../dto/create-prescription.dto";
import { UpdatePrescriptionDto } from "../dto/update-prescription.dto";
import { DispensePrescriptionDto } from "../dto/dispense-prescription.dto";
import { QueryPrescriptionsDto } from "../dto/query-prescriptions.dto";

export class PrescriptionsService {
  async listPrescriptions(
    auth: TenantAuthContext,
    query: QueryPrescriptionsDto,
  ): Promise<PrescriptionRecord[]> {
    return prescriptionsRepository.list(auth.tenantId, query);
  }

  async getPrescription(
    auth: TenantAuthContext,
    prescriptionId: string,
  ): Promise<PrescriptionRecord> {
    const prescription = await prescriptionsRepository.findById(auth.tenantId, prescriptionId);
    if (!prescription) {
      throw new NotFoundError("Prescription not found", undefined, "prescription.not_found");
    }
    return prescription;
  }

  async createPrescription(
    auth: TenantAuthContext,
    payload: CreatePrescriptionDto,
  ): Promise<PrescriptionRecord> {
    const branch = await prisma.branch.findFirst({
      where: { id: payload.branchId, tenantId: auth.tenantId, isActive: true },
    });
    if (!branch) {
      throw new NotFoundError("Branch not found", undefined, "branch.not_found");
    }

    if (payload.patientId) {
      const patient = await prisma.patient.findFirst({
        where: { id: payload.patientId, tenantId: auth.tenantId },
      });
      if (!patient) {
        throw new NotFoundError("Patient not found", undefined, "patient.not_found");
      }
    }

    return prescriptionsRepository.create(auth.tenantId, {
      branchId: payload.branchId,
      patientId: payload.patientId ?? null,
      prescriptionNumber: payload.prescriptionNumber ?? null,
      doctorName: payload.doctorName ?? null,
      doctorLicense: payload.doctorLicense ?? null,
      issuedAt: payload.issuedAt ? new Date(payload.issuedAt) : null,
      notes: payload.notes ?? null,
      items: payload.items.map((item) => ({
        drugName: item.drugName,
        quantity: new Prisma.Decimal(item.quantity),
        dosageInstructions: item.dosageInstructions ?? null,
      })),
    });
  }

  async updatePrescription(
    auth: TenantAuthContext,
    prescriptionId: string,
    payload: UpdatePrescriptionDto,
  ): Promise<PrescriptionRecord> {
    const prescription = await prescriptionsRepository.findById(auth.tenantId, prescriptionId);
    if (!prescription) {
      throw new NotFoundError("Prescription not found", undefined, "prescription.not_found");
    }
    if (prescription.status !== PrescriptionStatus.PENDING) {
      throw new BadRequestError(
        "Only PENDING prescriptions can be edited",
        undefined,
        "prescription.not_editable",
      );
    }

    if (payload.patientId) {
      const patient = await prisma.patient.findFirst({
        where: { id: payload.patientId, tenantId: auth.tenantId },
      });
      if (!patient) {
        throw new NotFoundError("Patient not found", undefined, "patient.not_found");
      }
    }

    return prescriptionsRepository.update(prescriptionId, {
      ...(payload.patientId !== undefined ? { patientId: payload.patientId ?? null } : {}),
      ...(payload.prescriptionNumber !== undefined
        ? { prescriptionNumber: payload.prescriptionNumber ?? null }
        : {}),
      ...(payload.doctorName !== undefined ? { doctorName: payload.doctorName ?? null } : {}),
      ...(payload.doctorLicense !== undefined
        ? { doctorLicense: payload.doctorLicense ?? null }
        : {}),
      ...(payload.issuedAt !== undefined
        ? { issuedAt: payload.issuedAt ? new Date(payload.issuedAt) : null }
        : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes ?? null } : {}),
      ...(payload.items !== undefined
        ? {
            items: payload.items.map((item) => ({
              drugName: item.drugName,
              quantity: new Prisma.Decimal(item.quantity),
              dosageInstructions: item.dosageInstructions ?? null,
            })),
          }
        : {}),
    });
  }

  async dispensePrescription(
    auth: TenantAuthContext,
    prescriptionId: string,
    payload: DispensePrescriptionDto,
  ): Promise<PrescriptionRecord> {
    const prescription = await prescriptionsRepository.findById(auth.tenantId, prescriptionId);
    if (!prescription) {
      throw new NotFoundError("Prescription not found", undefined, "prescription.not_found");
    }
    if (prescription.status === PrescriptionStatus.DISPENSED) {
      throw new ConflictError(
        "Prescription is already dispensed",
        undefined,
        "prescription.already_dispensed",
      );
    }
    if (prescription.status === PrescriptionStatus.CANCELLED) {
      throw new BadRequestError(
        "Prescription is cancelled",
        undefined,
        "prescription.cancelled",
      );
    }

    const sale = await prisma.sale.findFirst({
      where: { id: payload.saleId, tenantId: auth.tenantId },
    });
    if (!sale) {
      throw new NotFoundError("Sale not found", undefined, "sale.not_found");
    }

    // Guard: sale already linked to a different prescription
    const existing = await prescriptionsRepository.findBySaleId(auth.tenantId, payload.saleId);
    if (existing && existing.id !== prescriptionId) {
      throw new ConflictError(
        "Sale is already linked to another prescription",
        undefined,
        "prescription.sale_already_linked",
      );
    }

    return prescriptionsRepository.dispense(prescriptionId, payload.saleId);
  }

  async cancelPrescription(
    auth: TenantAuthContext,
    prescriptionId: string,
  ): Promise<PrescriptionRecord> {
    const prescription = await prescriptionsRepository.findById(auth.tenantId, prescriptionId);
    if (!prescription) {
      throw new NotFoundError("Prescription not found", undefined, "prescription.not_found");
    }
    if (prescription.status === PrescriptionStatus.DISPENSED) {
      throw new ConflictError(
        "Dispensed prescriptions cannot be cancelled",
        undefined,
        "prescription.already_dispensed",
      );
    }
    if (prescription.status === PrescriptionStatus.CANCELLED) {
      throw new ConflictError(
        "Prescription is already cancelled",
        undefined,
        "prescription.already_cancelled",
      );
    }

    return prescriptionsRepository.cancel(prescriptionId);
  }
}

export const prescriptionsService = new PrescriptionsService();
