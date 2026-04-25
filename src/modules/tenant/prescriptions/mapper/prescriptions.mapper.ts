import { Prescription, PrescriptionItem, PrescriptionStatus } from "@prisma/client";

export type PrescriptionRecord = Prescription & {
  items: PrescriptionItem[];
};

export interface PrescriptionItemResponse {
  id: string;
  drugName: string;
  quantity: string;
  dosageInstructions: string | null;
}

export interface PrescriptionResponse {
  id: string;
  tenantId: string;
  branchId: string;
  patientId: string | null;
  saleId: string | null;
  ocrDocumentId: string | null;
  prescriptionNumber: string | null;
  doctorName: string | null;
  doctorLicense: string | null;
  status: PrescriptionStatus;
  issuedAt: Date | null;
  dispensedAt: Date | null;
  notes: string | null;
  items: PrescriptionItemResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export function mapPrescriptionResponse(p: PrescriptionRecord): PrescriptionResponse {
  return {
    id: p.id,
    tenantId: p.tenantId,
    branchId: p.branchId,
    patientId: p.patientId ?? null,
    saleId: p.saleId ?? null,
    ocrDocumentId: p.ocrDocumentId ?? null,
    prescriptionNumber: p.prescriptionNumber ?? null,
    doctorName: p.doctorName ?? null,
    doctorLicense: p.doctorLicense ?? null,
    status: p.status,
    issuedAt: p.issuedAt ?? null,
    dispensedAt: p.dispensedAt ?? null,
    notes: p.notes ?? null,
    items: p.items.map((item) => ({
      id: item.id,
      drugName: item.drugName,
      quantity: item.quantity.toString(),
      dosageInstructions: item.dosageInstructions ?? null,
    })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
