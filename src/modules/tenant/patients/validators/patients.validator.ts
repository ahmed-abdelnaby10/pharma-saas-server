import { z } from "zod";
import { Gender } from "@prisma/client";

export const createPatientSchema = z.object({
  fullName: z.string().min(1).max(200),
  dateOfBirth: z.string().datetime().optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  nationalId: z.string().max(50).optional(),
  gender: z.nativeEnum(Gender).optional(),
  notes: z.string().max(2000).optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const queryPatientsSchema = z.object({
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  search: z.string().optional(),
});

export const patientIdParamSchema = z.object({
  patientId: z.string().cuid(),
});

export type CreatePatientDto = z.infer<typeof createPatientSchema>;
export type UpdatePatientDto = z.infer<typeof updatePatientSchema>;
export type QueryPatientsDto = z.infer<typeof queryPatientsSchema>;

export function parseCreatePatient(body: unknown): CreatePatientDto {
  return createPatientSchema.parse(body);
}

export function parseUpdatePatient(body: unknown): UpdatePatientDto {
  return updatePatientSchema.parse(body);
}

export function parseQueryPatients(query: unknown): QueryPatientsDto {
  return queryPatientsSchema.parse(query);
}

export function parsePatientIdParam(params: unknown): string {
  return patientIdParamSchema.parse(params).patientId;
}
