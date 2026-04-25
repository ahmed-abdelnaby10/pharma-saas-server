import { z } from "zod";
import { Gender } from "@prisma/client";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { CreatePatientDto } from "../dto/create-patient.dto";
import { UpdatePatientDto } from "../dto/update-patient.dto";
import { QueryPatientsDto } from "../dto/query-patients.dto";

const genders = Object.values(Gender) as [Gender, ...Gender[]];

const createPatientSchema = z.object({
  fullName: z.string().min(1).max(200),
  dateOfBirth: z.string().datetime({ offset: true }).nullable().optional(),
  phone: z.string().min(1).max(30).nullable().optional(),
  email: z.string().email().max(254).nullable().optional(),
  nationalId: z.string().min(1).max(50).nullable().optional(),
  gender: z.enum(genders).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const updatePatientSchema = z
  .object({
    fullName: z.string().min(1).max(200).optional(),
    dateOfBirth: z.string().datetime({ offset: true }).nullable().optional(),
    phone: z.string().min(1).max(30).nullable().optional(),
    email: z.string().email().max(254).nullable().optional(),
    nationalId: z.string().min(1).max(50).nullable().optional(),
    gender: z.enum(genders).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine(
    (d) =>
      d.fullName !== undefined ||
      d.dateOfBirth !== undefined ||
      d.phone !== undefined ||
      d.email !== undefined ||
      d.nationalId !== undefined ||
      d.gender !== undefined ||
      d.notes !== undefined,
    { message: "At least one field must be provided" },
  );

const queryPatientsSchema = z.object({
  search: z.string().min(1).max(100).optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

const patientIdParamSchema = z.object({ patientId: z.string().cuid("Invalid patientId") });

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseCreatePatientDto = (b: unknown): CreatePatientDto =>
  parse(createPatientSchema, b);
export const parseUpdatePatientDto = (b: unknown): UpdatePatientDto =>
  parse(updatePatientSchema, b);
export const parseQueryPatientsDto = (q: unknown): QueryPatientsDto =>
  parse(queryPatientsSchema, q) as QueryPatientsDto;
export const parsePatientIdParam = (p: unknown): string =>
  parse(patientIdParamSchema, p).patientId;
