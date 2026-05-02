export interface CreatePrescriptionItemDto {
  drugName: string;
  quantity: number;
  dosageInstructions?: string | null;
}

export interface CreatePrescriptionDto {
  branchId: string;
  patientId?: string | null;
  prescriptionNumber?: string | null;
  doctorName?: string | null;
  doctorLicense?: string | null;
  issuedAt?: string | null;
  notes?: string | null;
  items: CreatePrescriptionItemDto[];
}
