import { z } from "zod";
import { PrescriptionStatus } from "@prisma/client";

const prescriptionItemSchema = z.object({
  drugName: z.string().min(1).max(300),
  quantity: z.number().positive(),
  dosageInstructions: z.string().max(500).optional(),
});

export const createPrescriptionSchema = z.object({
  branchId: z.string().cuid(),
  patientId: z.string().cuid().optional(),
  prescriptionNumber: z.string().max(100).optional(),
  doctorName: z.string().max(200).optional(),
  doctorLicense: z.string().max(100).optional(),
  issuedAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(prescriptionItemSchema).min(1),
});

export const updatePrescriptionSchema = z.object({
  patientId: z.string().cuid().nullable().optional(),
  prescriptionNumber: z.string().max(100).optional(),
  doctorName: z.string().max(200).optional(),
  doctorLicense: z.string().max(100).optional(),
  issuedAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  items: z.array(prescriptionItemSchema).min(1).optional(),
});

export const queryPrescriptionsSchema = z.object({
  branchId: z.string().cuid().optional(),
  patientId: z.string().cuid().optional(),
  status: z.nativeEnum(PrescriptionStatus).optional(),
  search: z.string().optional(),
});

export const dispenseSchema = z.object({
  saleId: z.string().cuid(),
});

export const prescriptionIdParamSchema = z.object({
  prescriptionId: z.string().cuid(),
});

export type CreatePrescriptionDto = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionDto = z.infer<typeof updatePrescriptionSchema>;
export type QueryPrescriptionsDto = z.infer<typeof queryPrescriptionsSchema>;
export type DispenseDto = z.infer<typeof dispenseSchema>;

export function parseCreatePrescription(body: unknown): CreatePrescriptionDto {
  return createPrescriptionSchema.parse(body);
}
export function parseUpdatePrescription(body: unknown): UpdatePrescriptionDto {
  return updatePrescriptionSchema.parse(body);
}
export function parseQueryPrescriptions(query: unknown): QueryPrescriptionsDto {
  return queryPrescriptionsSchema.parse(query);
}
export function parseDispense(body: unknown): DispenseDto {
  return dispenseSchema.parse(body);
}
export function parsePrescriptionIdParam(params: unknown): string {
  return prescriptionIdParamSchema.parse(params).prescriptionId;
}
