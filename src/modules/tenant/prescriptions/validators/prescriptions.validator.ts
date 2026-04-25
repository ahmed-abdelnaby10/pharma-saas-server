import { z } from "zod";
import { PrescriptionStatus } from "@prisma/client";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { CreatePrescriptionDto } from "../dto/create-prescription.dto";
import { UpdatePrescriptionDto } from "../dto/update-prescription.dto";
import { DispensePrescriptionDto } from "../dto/dispense-prescription.dto";
import { QueryPrescriptionsDto } from "../dto/query-prescriptions.dto";

const statuses = Object.values(PrescriptionStatus) as [PrescriptionStatus, ...PrescriptionStatus[]];

const prescriptionItemSchema = z.object({
  drugName: z.string().min(1).max(200),
  quantity: z.number().positive(),
  dosageInstructions: z.string().max(500).nullable().optional(),
});

const createPrescriptionSchema = z.object({
  branchId: z.string().cuid("Invalid branchId"),
  patientId: z.string().cuid("Invalid patientId").nullable().optional(),
  prescriptionNumber: z.string().max(100).nullable().optional(),
  doctorName: z.string().max(200).nullable().optional(),
  doctorLicense: z.string().max(100).nullable().optional(),
  issuedAt: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(prescriptionItemSchema).min(1),
});

const updatePrescriptionSchema = z
  .object({
    patientId: z.string().cuid("Invalid patientId").nullable().optional(),
    prescriptionNumber: z.string().max(100).nullable().optional(),
    doctorName: z.string().max(200).nullable().optional(),
    doctorLicense: z.string().max(100).nullable().optional(),
    issuedAt: z.string().datetime({ offset: true }).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
    items: z.array(prescriptionItemSchema).min(1).optional(),
  })
  .refine(
    (d) =>
      d.patientId !== undefined ||
      d.prescriptionNumber !== undefined ||
      d.doctorName !== undefined ||
      d.doctorLicense !== undefined ||
      d.issuedAt !== undefined ||
      d.notes !== undefined ||
      d.items !== undefined,
    { message: "At least one field must be provided" },
  );

const dispensePrescriptionSchema = z.object({
  saleId: z.string().cuid("Invalid saleId"),
});

const queryPrescriptionsSchema = z.object({
  branchId: z.string().cuid().optional(),
  patientId: z.string().cuid().optional(),
  status: z.enum(statuses).optional(),
  search: z.string().min(1).max(200).optional(),
});

const prescriptionIdParamSchema = z.object({
  prescriptionId: z.string().cuid("Invalid prescriptionId"),
});

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseCreatePrescriptionDto = (b: unknown): CreatePrescriptionDto =>
  parse(createPrescriptionSchema, b);
export const parseUpdatePrescriptionDto = (b: unknown): UpdatePrescriptionDto =>
  parse(updatePrescriptionSchema, b);
export const parseDispensePrescriptionDto = (b: unknown): DispensePrescriptionDto =>
  parse(dispensePrescriptionSchema, b);
export const parseQueryPrescriptionsDto = (q: unknown): QueryPrescriptionsDto =>
  parse(queryPrescriptionsSchema, q) as QueryPrescriptionsDto;
export const parsePrescriptionIdParam = (p: unknown): string =>
  parse(prescriptionIdParamSchema, p).prescriptionId;
