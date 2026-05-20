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
  /**
   * When true, the service transitions the PO to ORDERED and immediately
   * calls receiveOrder for every line using batch/expiry data from the OCR
   * extraction.  Inventory quantityOnHand is updated and the PO ends as
   * RECEIVED (or PARTIALLY_RECEIVED if some lines had zero quantity).
   * Items with no extracted batchNumber get a generated fallback;
   * items with no extracted expiryDate get a 2-year-from-today fallback.
   * Implies markOrdered.
   */
  autoReceive?: boolean;
}

export interface InvoiceLineResolution {
  description:       string;
  catalogItemId:     string;
  catalogStatus:     CatalogItemStatus;
  catalogCreated:    boolean;
  inventoryItemId:   string;
  inventoryCreated:  boolean;
  quantity:          number;
  unitCost:          number | null;  // already has discount applied
  originalUnitPrice: number | null;  // raw price before discount
  discountPercent:   number | null;
  /** Batch number extracted from invoice — use to pre-fill the receive step. */
  batchNumber:       string | null;
  /** Expiry date extracted from invoice — use to pre-fill the receive step. */
  expiryDate:        string | null;
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

    // Idempotency: if a PO already exists for this OCR doc, return it — unless
    // it is an empty shell (items failed to add on a previous attempt), in which
    // case delete it and re-run so this call succeeds cleanly.
    const existingPo = await prisma.purchaseOrder.findFirst({
      where: { tenantId: auth.tenantId, externalId },
      include: { items: { select: { id: true } } },
    });
    if (existingPo) {
      if (existingPo.items.length > 0) {
        const po = await purchasingService.getOrder(auth, existingPo.id);
        return { purchaseOrder: po, resolution: [], alreadyConverted: true };
      }
      // Empty shell from a previously failed attempt — discard and re-run
      await prisma.purchaseOrder.delete({ where: { id: existingPo.id } });
    }

    // Resolve each line → catalog item → inventory item.
    // Merge duplicate descriptions (same resolved inventory item) so the PO
    // doesn't reject a duplicate line.
    const merged = new Map<string, InvoiceLineResolution>();

    for (const line of data.lineItems) {
      const description = (line.description ?? "").trim();
      if (!description) continue;

      // English name from model translation (may be null for old extractions)
      const nameEn = (line.nameEn ?? "").trim() || null;

      const quantity = line.quantity > 0 ? line.quantity : 1;

      // Apply line-level discount to unitPrice if present
      const discountPercent = line.discountPercent != null && line.discountPercent > 0
        ? line.discountPercent
        : null;
      const rawUnitPrice = line.unitPrice > 0 ? line.unitPrice : null;
      const unitCost = rawUnitPrice != null && discountPercent != null
        ? parseFloat((rawUnitPrice * (1 - discountPercent / 100)).toFixed(4))
        : rawUnitPrice;

      // Batch / expiry passed through to resolution for the receive step
      const batchNumber = (line.batchNumber ?? "").trim() || null;
      const expiryDate  = (line.expiryDate  ?? "").trim() || null;

      // 1. Catalog: match by name.
      //    Priority: English name (translated by model) → Arabic description.
      //    This handles Egyptian invoices where nameEn in catalog is English
      //    but the OCR description is Arabic.
      const nameOrConditions: object[] = [];
      if (nameEn) {
        nameOrConditions.push(
          { nameEn:        { equals: nameEn,      mode: "insensitive" as const } },
          { nameEn:        { contains: nameEn,    mode: "insensitive" as const } },
          { genericNameEn: { contains: nameEn,    mode: "insensitive" as const } },
        );
      }
      // Always also try matching the raw Arabic description against nameAr
      nameOrConditions.push(
        { nameAr:        { equals: description,   mode: "insensitive" as const } },
        { nameAr:        { contains: description, mode: "insensitive" as const } },
        { nameEn:        { equals: description,   mode: "insensitive" as const } },
      );

      const existingCatalog = await prisma.catalogItem.findFirst({
        where: {
          OR: [
            { status: CatalogItemStatus.ACTIVE },
            {
              status:              CatalogItemStatus.PENDING_REVIEW,
              submittedByTenantId: auth.tenantId,
            },
          ],
          AND: [{ OR: nameOrConditions }],
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
        // Auto-create a PENDING_REVIEW catalog stub.
        // nameEn  = English translation from model (or Arabic description as fallback)
        // nameAr  = Arabic description as printed on the invoice
        const { record } = await catalogRepository.suggestFromTenant({
          nameEn:              nameEn ?? description,
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
        // Keep earliest expiry when merging duplicate lines
        if (!prev.expiryDate && expiryDate) prev.expiryDate = expiryDate;
        if (!prev.batchNumber && batchNumber) prev.batchNumber = batchNumber;
      } else {
        merged.set(inv.id, {
          description,
          catalogItemId,
          catalogStatus,
          catalogCreated,
          inventoryItemId:  inv.id,
          inventoryCreated,
          quantity,
          unitCost,
          originalUnitPrice: rawUnitPrice,
          discountPercent,
          batchNumber,
          expiryDate,
        });
      }
    }

    const resolution = [...merged.values()];
    if (resolution.length === 0) {
      throw new BadRequestError(
        t("ocr.no_line_items") || "No usable line items in this invoice",
      );
    }

    // Resolve supplier: use explicitly-passed supplierId first; if omitted,
    // try to match the invoice's supplierName against existing tenant suppliers
    // (the /review endpoint already creates the supplier, so this usually finds it).
    let resolvedSupplierId: string | null = opts.supplierId !== undefined
      ? (opts.supplierId ?? null)
      : null;

    if (opts.supplierId === undefined && data.supplierName) {
      const supplierName = data.supplierName.trim();
      const found = await prisma.supplier.findFirst({
        where: {
          tenantId: auth.tenantId,
          OR: [
            { nameEn: { equals: supplierName, mode: "insensitive" } },
            { nameAr: { equals: supplierName, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      if (found) resolvedSupplierId = found.id;
    }

    // Create the DRAFT purchase order (externalId gives data-level idempotency)
    const order = await purchasingService.createOrder(auth, {
      branchId,
      supplierId: resolvedSupplierId,
      notes: `Created from OCR invoice ${data.invoiceNumber ?? doc.fileName}`,
      externalId,
    });

    // Add each merged line
    for (const r of resolution) {
      await purchasingService.addItem(auth, order.id, {
        inventoryItemId:  r.inventoryItemId,
        quantityOrdered:  r.quantity,
        unitCost:          r.unitCost,
        originalUnitPrice: r.originalUnitPrice ?? null,
        discountPercent:   r.discountPercent   ?? null,
        batchNumber:       r.batchNumber       ?? null,
        expiryDate:        r.expiryDate        ?? null,
      });
    }

    // Transition to ORDERED when explicitly requested or when autoReceive implies it
    if (opts.markOrdered || opts.autoReceive) {
      await purchasingService.updateOrder(auth, order.id, { status: "ORDERED" });
    }

    // ── Auto-receive ──────────────────────────────────────────────────────────
    // Build a receive payload from the OCR extraction data so the user
    // doesn't have to go through a separate receive step.
    if (opts.autoReceive) {
      // Reload to get the real PO item IDs that were just persisted
      const orderedPo = await purchasingService.getOrder(auth, order.id);

      const twoYearsFromNow = new Date(
        Date.now() + 2 * 365 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const receiveLines = resolution
        .map((r, idx) => {
          const poItem = orderedPo.items.find(
            (i) => i.inventoryItemId === r.inventoryItemId,
          );
          if (!poItem) return null;

          // Use extracted batch/expiry; generate safe fallbacks when absent
          const batchNumber =
            r.batchNumber ??
            `OCR-${documentId.slice(-6).toUpperCase()}${idx > 0 ? `-${idx}` : ""}`;
          const expiryDate = r.expiryDate ?? twoYearsFromNow;

          return {
            purchaseOrderItemId: poItem.id,
            quantityReceived:    r.quantity,
            batchNumber,
            expiryDate,
            unitCost: r.unitCost ?? undefined,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      if (receiveLines.length > 0) {
        await purchasingService.receiveOrder(auth, order.id, {
          items: receiveLines,
        });
      }
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
