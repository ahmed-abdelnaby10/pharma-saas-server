import { Prescription, PrescriptionItem } from "@prisma/client";

export type PrescriptionWithItems = Prescription & { items: PrescriptionItem[] };

export function mapPrescriptionResponse(p: PrescriptionWithItems) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    branchId: p.branchId,
    patientId: p.patientId,
    saleId: p.saleId,
    prescriptionNumber: p.prescriptionNumber,
    doctorName: p.doctorName,
    doctorLicense: p.doctorLicense,
    status: p.status,
    issuedAt: p.issuedAt,
    dispensedAt: p.dispensedAt,
    notes: p.notes,
    ocrDocumentId: p.ocrDocumentId,
    items: p.items.map((item) => ({
      id: item.id,
      drugName: item.drugName,
      quantity: item.quantity,
      dosageInstructions: item.dosageInstructions,
    })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
