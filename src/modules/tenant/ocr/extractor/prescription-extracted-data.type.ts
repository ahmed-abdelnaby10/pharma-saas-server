export interface PrescriptionMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  quantity: number | null;
  instructions: string | null;
}

export interface PrescriptionExtractedData {
  patientName: string | null;
  patientDateOfBirth: string | null;  // ISO date YYYY-MM-DD
  doctorName: string | null;
  doctorLicenseNumber: string | null;
  prescriptionDate: string | null;    // ISO date YYYY-MM-DD
  medications: PrescriptionMedication[];
  notes: string | null;
  /** Extraction confidence 0–1. 0 = stub/unknown. */
  confidence: number;
}
