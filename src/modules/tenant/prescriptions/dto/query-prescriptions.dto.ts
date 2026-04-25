import { PrescriptionStatus } from "@prisma/client";

export interface QueryPrescriptionsDto {
  branchId?: string;
  patientId?: string;
  status?: PrescriptionStatus;
  search?: string;
}
