import { PrescriptionStatus } from "@prisma/client";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { ConflictError } from "../../../../shared/errors/conflict-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { Translator } from "../../../../shared/types/locale.types";
import { prisma } from "../../../../core/db/prisma";
import { PrescriptionWithItems } from "../mapper/prescriptions.mapper";
import {
  prescriptionsRepository,
  PrescriptionsRepository,
} from "../repository/prescriptions.repository";
import {
  CreatePrescriptionDto,
  DispenseDto,
  QueryPrescriptionsDto,
  UpdatePrescriptionDto,
} from "../validators/prescriptions.validator";

export class PrescriptionsService {
  constructor(private readonly repo: PrescriptionsRepository) {}

  async list(tenantId: string, query: QueryPrescriptionsDto): Promise<PrescriptionWithItems[]> {
    return this.repo.list(tenantId, query);
  }

  async getById(
    tenantId: string,
    prescriptionId: string,
    t: Translator,
  ): Promise<PrescriptionWithItems> {
    const rx = await this.repo.findById(tenantId, prescriptionId);
    if (!rx) throw new NotFoundError(t("prescription.not_found"));
    return rx;
  }

  async create(
    tenantId: string,
    payload: CreatePrescriptionDto,
    t: Translator,
  ): Promise<PrescriptionWithItems> {
    // Validate branch belongs to tenant
    const branch = await prisma.branch.findFirst({
      where: { id: payload.branchId, tenantId },
    });
    if (!branch) throw new NotFoundError(t("branch.not_found"));

    // Validate patient belongs to tenant (if provided)
    if (payload.patientId) {
      const patient = await prisma.patient.findFirst({
        where: { id: payload.patientId, tenantId },
      });
      if (!patient) throw new NotFoundError(t("patient.not_found"));
    }

    return this.repo.create(tenantId, payload);
  }

  async update(
    tenantId: string,
    prescriptionId: string,
    payload: UpdatePrescriptionDto,
    t: Translator,
  ): Promise<PrescriptionWithItems> {
    const rx = await this.getById(tenantId, prescriptionId, t);

    if (rx.status !== PrescriptionStatus.PENDING) {
      throw new BadRequestError(t("prescription.not_pending"));
    }

    // Validate new patient if being changed
    if (payload.patientId) {
      const patient = await prisma.patient.findFirst({
        where: { id: payload.patientId, tenantId },
      });
      if (!patient) throw new NotFoundError(t("patient.not_found"));
    }

    return this.repo.update(tenantId, prescriptionId, payload);
  }

  async dispense(
    tenantId: string,
    prescriptionId: string,
    payload: DispenseDto,
    t: Translator,
  ): Promise<PrescriptionWithItems> {
    const rx = await this.getById(tenantId, prescriptionId, t);

    if (rx.status !== PrescriptionStatus.PENDING) {
      throw new BadRequestError(t("prescription.not_pending"));
    }

    // Validate the sale belongs to the same tenant
    const sale = await prisma.sale.findFirst({ where: { id: payload.saleId, tenantId } });
    if (!sale) throw new NotFoundError(t("sale.not_found"));

    // A sale can only be linked to one prescription
    const existingLink = await this.repo.findBySaleId(tenantId, payload.saleId);
    if (existingLink) throw new ConflictError(t("prescription.sale_already_linked"));

    return this.repo.dispense(prescriptionId, payload.saleId);
  }

  async cancel(
    tenantId: string,
    prescriptionId: string,
    t: Translator,
  ): Promise<PrescriptionWithItems> {
    const rx = await this.getById(tenantId, prescriptionId, t);

    if (rx.status === PrescriptionStatus.DISPENSED) {
      throw new BadRequestError(t("prescription.cannot_cancel_dispensed"));
    }
    if (rx.status === PrescriptionStatus.CANCELLED) {
      return rx; // idempotent
    }

    return this.repo.cancel(prescriptionId);
  }
}

export const prescriptionsService = new PrescriptionsService(prescriptionsRepository);
