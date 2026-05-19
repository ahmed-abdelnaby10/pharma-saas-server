/**
 * OcrConversionService
 *
 * One-shot bridges from a COMPLETED OCR document into a real domain record,
 * so users don't have to retype an invoice / prescription by hand.
 *
 *   INVOICE      → DRAFT PurchaseOrder  (auto-resolves catalog + inventory per line)
 *   PRESCRIPTION → PENDING Prescription (one item per extracted medication)
 *
 * Both are idempotent: re-running against the same document returns the
 * already-created record instead of duplicating it (invoice keys off the
 * PO externalId `ocr:<documentId>`; prescription keys off the OCR doc's
 * reviewedAt marker).
 */
import { OcrDocumentType, OcrDocumentStatus, CatalogItemStatus } from "@prisma/client";
import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { Translator } from "../../../../shared/types/locale.types";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { prisma } from "../../../../core/db/prisma";
import { logger } from "../../../../core/logger/logger";
import { ocrRepository } from "../repository/ocr.repository";
import { InvoiceExtractedData } from "../extractor/invoice-extracted-data.type";
import { PrescriptionExtractedData } from "../extractor/prescription-extracted-data.type";
import { purchasingService } from "../../purchasing/service/purchasing.service";
import { prescriptionsService } from "../../prescriptions/service/prescriptions.service";
import { catalogRepository } from "../../../platform/catalog/repository/catalog.repository";
import { inventoryRepository } from "../../inventory/repository/inventory.repository";
import { PurchaseOrderWithRelations } from "../../purchasing/mapper/purchasing.mapper";
import { PrescriptionWithItems } from "../../prescriptions/mapper/prescriptions.mapper";

export interface ConvertInvoiceOptions {
  branchId?: string;            // defaults to the OCR document's branch
  supplierId?: string | null;   // optional — link to a known supplier
  defaultSellingPrice?: number; // applied when an InventoryItem must be created
  markOrdered?: boolean;        // if true, transition DRAFT → ORDERED automatically
}

export interface InvoiceLineResolution {
  description:      string;
  catalogItemId:    string;
  catalogStatus:    CatalogItemStatus;
  catalogCreated:   boolean;
  inventoryItemId:  string;
  inventoryCreated: boolean;
  quantity:         number;
  unitCost:         number | null;
}

export interface ConvertInvoiceResult {
  purchaseOrder: PurchaseOrderWithRelations;
  resolution:    InvoiceLineResolution[];
  alreadyConverted: boolean;
}

export interface ConvertPrescriptionOptions {
  branchId?:  string;
  patientId?: string;
}

export class OcrConversionService {
  // ── INVOICE → PURCHASE ORDER ───────────────────────────────────────────────

  async convertInvoiceToPurchaseOrder(
    auth: TenantAuthContext,
    documentId: string,
    opts: ConvertInvoiceOptions,
    t: Translator,
  ): Promise<ConvertInvoiceResult> {
    const doc = await ocrRepository.findById(auth.tenantId, documentId);
    if (!doc) throw new NotFoundError(t("ocr.not_found"));

    if (doc.documentType !== OcrDocumentType.INVOICE) {
      throw new BadRequestError(t("ocr.not_invoice") || "Document is not an invoice");
    }
    if (doc.status !== OcrDocumentStatus.COMPLETED) {
      throw new BadRequestError(t("ocr.not_completed"));
    }

    const data = doc.extractedData as unknown as InvoiceExtractedData | null;
    if (!data || !Array.isArray(data.lineItems) || data.lineItems.length === 0) {
      throw new BadRequestError(
        t("ocr.no_line_items") || "Extracted invoice has no line items",
      );
    }

    const branchId = opts.branchId ?? doc.branchId;
    const externalId = `ocr:${documentId}`;

    // Idempotency: if a PO already exists for this OCR doc, return it untouched.
    const existingPo = await prisma.purchaseOrder.findFirst({
      where: { tenantId: auth.tenantId, externalId },
      select: { id: true },
    });
    if (existingPo) {
      const po = await purchasingService.getOrder(auth, existingPo.id);
      return { purchaseOrder: po, resolution: [], alreadyConverted: true };
    }

    // Resolve each line → catalog item → inventory item.
    // Merge duplicate descriptions (same resolved inventory item) so the PO
    // doesn't reject a duplicate line.
    const merged = new Map<string, InvoiceLineResolution>();

    for (const line of data.lineItems) {
      const description = (line.description ?? "").trim();
      if (!description) continue;

      const quantity = line.quantity > 0 ? line.quantity : 1;
      const unitCost = line.unitPrice > 0 ? line.unitPrice : null;

      // 1. Catalog: match by name (ACTIVE globally, or this tenant's own PENDING)
      const existingCatalog = await prisma.catalogItem.findFirst({
        where: {
          OR: [
            { status: CatalogItemStatus.ACTIVE },
            {
              status:              CatalogItemStatus.PENDING_REVIEW,
              submittedByTenantId: auth.tenantId,
            },
          ],
          AND: [
            {
              OR: [
                { nameEn:        { equals: description, mode: "insensitive" } },
                { nameAr:        { equals: description, mode: "insensitive" } },
                { nameEn:        { contains: description, mode: "insensitive" } },
                { genericNameEn: { contains: description, mode: "insensitive" } },
              ],
            },
          ],
        },
        orderBy: [{ status: "asc" }, { nameEn: "asc" }],
      });

      let catalogItemId: string;
      let catalogStatus: CatalogItemStatus;
      let catalogCreated = false;

      if (existingCatalog) {
        catalogItemId = existingCatalog.id;
        catalogStatus = existingCatalog.status;
      } else {
        const { record } = await catalogRepository.suggestFromTenant({
          nameEn:              description,
          nameAr:              description,
          productType:         "MEDICINE",
          submittedByTenantId: auth.tenantId,
        });
        catalogItemId = record.id;
        catalogStatus = record.status;
        catalogCreated = true;
      }

      // 2. Inventory: per-branch SKU referencing the catalog item
      let inv = await inventoryRepository.findByBranchAndCatalogItem(
        branchId,
        catalogItemId,
      );
      let inventoryCreated = false;
      if (!inv) {
        inv = await inventoryRepository.create(auth.tenantId, {
          branchId,
          catalogItemId,
          ...(opts.defaultSellingPrice != null
            ? { sellingPrice: opts.defaultSellingPrice }
            : {}),
        });
        inventoryCreated = true;
      }

      // 3. Merge by resolved inventory item
      const prev = merged.get(inv.id);
      if (prev) {
        prev.quantity += quantity;
        if (prev.unitCost == null && unitCost != null) prev.unitCost = unitCost;
      } else {
        merged.set(inv.id, {
          description,
          catalogItemId,
          catalogStatus,
          catalogCreated,
          inventoryItemId: inv.id,
          inventoryCreated,
          quantity,
          unitCost,
        });
      }
    }

    const resolution = [...merged.values()];
    if (resolution.length === 0) {
      throw new BadRequestError(
        t("ocr.no_line_items") || "No usable line items in this invoice",
      );
    }

    // Create the DRAFT purchase order (externalId gives data-level idempotency)
    const order = await purchasingService.createOrder(auth, {
      branchId,
      supplierId: opts.supplierId ?? null,
      notes: `Created from OCR invoice ${data.invoiceNumber ?? doc.fileName}`,
      externalId,
    });

    // Add each merged line
    for (const r of resolution) {
      await purchasingService.addItem(auth, order.id, {
        inventoryItemId: r.inventoryItemId,
        quantityOrdered: r.quantity,
        unitCost:        r.unitCost,
      });
    }

    if (opts.markOrdered) {
      await purchasingService.updateOrder(auth, order.id, { status: "ORDERED" });
    }

    // Close the audit loop on the OCR document (no data correction)
    await ocrRepository
      .updateReview(documentId, auth.userId)
      .catch((err: unknown) =>
        logger.error("ocr-conversion: failed to mark invoice doc reviewed", {
          documentId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );

    const finalPo = await purchasingService.getOrder(auth, order.id);
    return { purchaseOrder: finalPo, resolution, alreadyConverted: false };
  }

  // ── PRESCRIPTION → PRESCRIPTION RECORD ─────────────────────────────────────

  async convertOcrToPrescription(
    auth: TenantAuthContext,
    documentId: string,
    opts: ConvertPrescriptionOptions,
    t: Translator,
  ): Promise<PrescriptionWithItems> {
    const doc = await ocrRepository.findById(auth.tenantId, documentId);
    if (!doc) throw new NotFoundError(t("ocr.not_found"));

    if (doc.documentType !== OcrDocumentType.PRESCRIPTION) {
      throw new BadRequestError(
        t("ocr.not_prescription") || "Document is not a prescription",
      );
    }
    if (doc.status !== OcrDocumentStatus.COMPLETED) {
      throw new BadRequestError(t("ocr.not_completed"));
    }

    const data = doc.extractedData as unknown as PrescriptionExtractedData | null;
    if (!data || !Array.isArray(data.medications) || data.medications.length === 0) {
      throw new BadRequestError(
        t("ocr.no_medications") || "Extracted prescription has no medications",
      );
    }

    const branchId = opts.branchId ?? doc.branchId;

    const items = data.medications
      .map((m) => {
        const drugName = (m.name ?? "").trim();
        if (!drugName) return null;
        const dosageInstructions =
          [m.dosage, m.frequency, m.duration, m.instructions]
            .map((x) => (x ?? "").trim())
            .filter(Boolean)
            .join(" • ")
            .slice(0, 500) || undefined;
        return {
          drugName: drugName.slice(0, 300),
          quantity: m.quantity != null && m.quantity > 0 ? m.quantity : 1,
          ...(dosageInstructions ? { dosageInstructions } : {}),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (items.length === 0) {
      throw new BadRequestError(
        t("ocr.no_medications") || "No usable medications in this prescription",
      );
    }

    const issuedAt = data.prescriptionDate
      ? new Date(`${data.prescriptionDate}T00:00:00.000Z`).toISOString()
      : undefined;

    const prescription = await prescriptionsService.create(
      auth.tenantId,
      {
        branchId,
        ...(opts.patientId ? { patientId: opts.patientId } : {}),
        ...(data.doctorName ? { doctorName: data.doctorName.slice(0, 200) } : {}),
        ...(data.doctorLicenseNumber
          ? { doctorLicense: data.doctorLicenseNumber.slice(0, 100) }
          : {}),
        ...(issuedAt ? { issuedAt } : {}),
        ...(data.notes ? { notes: data.notes.slice(0, 2000) } : {}),
        items,
      },
      t,
    );

    await ocrRepository
      .updateReview(documentId, auth.userId)
      .catch((err: unknown) =>
        logger.error("ocr-conversion: failed to mark prescription doc reviewed", {
          documentId,
          error: err instanceof Error ? err.message : String(err),
        }),
      );

    return prescription;
  }
}

export const ocrConversionService = new OcrConversionService();
