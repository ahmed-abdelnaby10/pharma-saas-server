export interface UpdatePrescriptionItemDto {
  drugName: string;
  quantity: number;
  dosageInstructions?: string | null;
}

export interface UpdatePrescriptionDto {
  patientId?: string | null;
  prescriptionNumber?: string | null;
  doctorName?: string | null;
  doctorLicense?: string | null;
  issuedAt?: string | null;
  notes?: string | null;
  items?: UpdatePrescriptionItemDto[];
}
