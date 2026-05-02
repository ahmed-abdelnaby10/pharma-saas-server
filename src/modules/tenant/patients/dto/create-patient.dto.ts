import { Gender } from "@prisma/client";

export interface CreatePatientDto {
  fullName: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  nationalId?: string | null;
  gender?: Gender | null;
  notes?: string | null;
}
