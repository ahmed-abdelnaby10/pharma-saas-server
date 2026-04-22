import { PrescriptionExtractor } from "./prescription-extractor.interface";
import { PrescriptionExtractedData } from "./prescription-extracted-data.type";

/**
 * Stub extractor — returns plausible-looking prescription data without calling
 * any external OCR service. Used in development and tests.
 * Replace with a real implementation by binding a different instance.
 */
export class StubPrescriptionExtractor implements PrescriptionExtractor {
  async extract(_absoluteFilePath: string, _mimeType: string): Promise<PrescriptionExtractedData> {
    // Simulate brief processing time
    await new Promise((resolve) => setTimeout(resolve, 300));

    const today = new Date().toISOString().split("T")[0]!;

    return {
      patientName: "Ahmed Al-Rashidi",
      patientDateOfBirth: "1990-06-15",
      doctorName: "Dr. Fatima Al-Zahraa",
      doctorLicenseNumber: "SAH-00123",
      prescriptionDate: today,
      medications: [
        {
          name: "Amoxicillin 500mg",
          dosage: "500mg",
          frequency: "Three times daily",
          duration: "7 days",
          quantity: 21,
          instructions: "Take with food",
        },
        {
          name: "Ibuprofen 400mg",
          dosage: "400mg",
          frequency: "Twice daily",
          duration: "5 days",
          quantity: 10,
          instructions: "Take after meals",
        },
      ],
      notes: "Patient allergic to penicillin — verify before dispensing.",
      confidence: 0, // 0 = stub — not real extraction
    };
  }
}

export const stubPrescriptionExtractor = new StubPrescriptionExtractor();
