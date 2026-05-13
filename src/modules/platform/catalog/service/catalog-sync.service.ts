/**
 * CatalogSyncService
 *
 * Manually-triggered sync from three external sources:
 *   1. OpenFDA NDC (US medicines, free API)
 *   2. Open Beauty Facts (cosmetics, free API)
 *   3. EDA (Egyptian Drug Authority, local CSV file)
 *
 * All three use the same upsert-by-sourceId pattern in the repository.
 * Each sync returns a SyncResult summary: { added, updated, skipped, errors }.
 *
 * NOTE: These are one-shot manual triggers — no job scheduler involved.
 * The platform admin calls POST /platform/catalog/sync/<source> whenever needed.
 */

import { createReadStream } from "fs";
import { parse as parseCsv } from "csv-parse";
import { logger } from "../../../../core/logger/logger";
import {
  catalogRepository,
  CatalogRepository,
  UpsertCatalogItemPayload,
} from "../repository/catalog.repository";

export interface SyncResult {
  added:   number;
  updated: number;
  skipped: number;
  errors:  number;
  total:   number;
}

// ── OpenFDA ───────────────────────────────────────────────────────────────────

const OPENFDA_BASE = "https://api.fda.gov/drug/ndc.json";

async function fetchOpenFDAPage(
  skip: number,
  limit: number,
): Promise<{ results: any[]; total: number }> {
  const url = `${OPENFDA_BASE}?limit=${limit}&skip=${skip}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenFDA request failed: ${res.status} ${res.statusText}`);
  }
  const body = await res.json() as any;
  return {
    results: body.results ?? [],
    total:   body.meta?.results?.total ?? 0,
  };
}

function mapOpenFDAResult(r: any): UpsertCatalogItemPayload {
  const brandName       = r.brand_name        ?? r.proprietary_name        ?? "";
  const genericName     = r.generic_name       ?? r.nonproprietary_name     ?? brandName;
  const manufacturer    = r.labeler_name       ?? null;
  const dosageForm      = r.dosage_form        ?? null;
  const route           = r.route?.[0]         ?? null;
  const barcode         = r.packaging?.[0]?.package_ndc ?? null;
  const atcCode: string | null = null; // OpenFDA doesn't provide ATC codes
  const requires        = false; // can't reliably determine from NDC data

  return {
    sourceId:             `openfda:${r.product_ndc}`,
    source:               "OPENFDA",
    nameEn:               brandName  || genericName,
    nameAr:               brandName  || genericName, // no Arabic from OpenFDA
    genericNameEn:        genericName !== brandName ? genericName : null,
    genericNameAr:        genericName !== brandName ? genericName : null,
    barcode,
    manufacturer,
    dosageForm,
    strength:             route,
    category:             r.product_type ?? null,
    unitOfMeasure:        "unit",
    productType:          "MEDICINE",
    requiresPrescription: requires,
    atcCode,
    isActive:             true,
  };
}

// ── Open Beauty Facts ─────────────────────────────────────────────────────────

const OBF_BASE = "https://world.openbeautyfacts.org/cgi/search.pl";

async function fetchOpenBeautyPage(
  page: number,
  pageSize: number,
): Promise<{ products: any[]; count: number }> {
  const params = new URLSearchParams({
    action:    "process",
    json:      "1",
    page:      String(page),
    page_size: String(pageSize),
    fields:    "code,product_name,product_name_en,product_name_ar,brands,categories,image_url",
  });
  const url = `${OBF_BASE}?${params.toString()}`;
  const res  = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open Beauty Facts request failed: ${res.status} ${res.statusText}`);
  }
  const body = await res.json() as any;
  return {
    products: body.products ?? [],
    count:    body.count    ?? 0,
  };
}

function mapOpenBeautyResult(p: any): UpsertCatalogItemPayload | null {
  const nameEn =
    p.product_name_en ||
    p.product_name    ||
    p.brands          ||
    null;
  if (!nameEn) return null; // skip items with no usable name

  const barcode = p.code && p.code.length > 3 ? p.code : null;

  return {
    sourceId:    `obf:${p.code}`,
    source:      "OPENBEAUTY",
    nameEn,
    nameAr:      p.product_name_ar || nameEn,
    manufacturer: p.brands || null,
    barcode,
    category:    p.categories?.split(",")[0]?.trim() || null,
    unitOfMeasure: "unit",
    productType: "COSMETIC",
    imageUrl:    p.image_url || null,
    isActive:    true,
  };
}

// ── EDA CSV ───────────────────────────────────────────────────────────────────
// Expected CSV columns (Arabic headers + English):
//   reg_no, nameAr, nameEn, genericNameAr, genericNameEn,
//   manufacturer, dosageForm, strength, category, requiresPrescription

type EdaRow = {
  reg_no:               string;
  nameAr:               string;
  nameEn:               string;
  genericNameAr?:       string;
  genericNameEn?:       string;
  manufacturer?:        string;
  dosageForm?:          string;
  strength?:            string;
  category?:            string;
  requiresPrescription?: string;
};

async function parseEdaCsv(filePath: string): Promise<EdaRow[]> {
  return new Promise((resolve, reject) => {
    const rows: EdaRow[] = [];
    createReadStream(filePath)
      .pipe(
        parseCsv({
          columns:          true,
          skip_empty_lines: true,
          trim:             true,
          bom:              true,
        }),
      )
      .on("data", (row: EdaRow) => rows.push(row))
      .on("end",  () => resolve(rows))
      .on("error", reject);
  });
}

function mapEdaRow(row: EdaRow): UpsertCatalogItemPayload | null {
  if (!row.reg_no || !row.nameEn) return null;

  const requiresPrescription =
    row.requiresPrescription?.trim().toLowerCase() === "yes" ||
    row.requiresPrescription?.trim() === "1";

  return {
    sourceId:             `eda:${row.reg_no.trim()}`,
    source:               "EDA",
    nameEn:               row.nameEn.trim(),
    nameAr:               row.nameAr?.trim() || row.nameEn.trim(),
    genericNameEn:        row.genericNameEn?.trim() || null,
    genericNameAr:        row.genericNameAr?.trim() || null,
    manufacturer:         row.manufacturer?.trim() || null,
    dosageForm:           row.dosageForm?.trim() || null,
    strength:             row.strength?.trim() || null,
    category:             row.category?.trim() || null,
    requiresPrescription,
    unitOfMeasure:        "unit",
    productType:          "MEDICINE",
    isActive:             true,
  };
}

// ── CatalogSyncService ────────────────────────────────────────────────────────

export class CatalogSyncService {
  constructor(private readonly repository: CatalogRepository) {}

  /**
   * Sync medicines from OpenFDA NDC database.
   * @param maxItems  Cap on total items to process (default 5 000 per call)
   */
  async syncFromOpenFDA(maxItems = 5_000): Promise<SyncResult> {
    const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: 0, total: 0 };
    const pageSize = 100;
    let skip = 0;
    let fetched = 0;

    logger.info("catalog-sync: starting OpenFDA sync", { maxItems });

    while (fetched < maxItems) {
      let page: { results: any[]; total: number };
      try {
        page = await fetchOpenFDAPage(skip, pageSize);
      } catch (err) {
        logger.error("catalog-sync: OpenFDA fetch error", { skip, error: String(err) });
        result.errors++;
        break;
      }

      if (page.results.length === 0) break;

      for (const r of page.results) {
        if (fetched >= maxItems) break;
        fetched++;
        result.total++;

        try {
          const payload = mapOpenFDAResult(r);
          const { wasCreated } = await this.repository.upsertFromSource(payload);
          wasCreated ? result.added++ : result.updated++;
        } catch (err) {
          logger.warn("catalog-sync: OpenFDA item error", {
            ndc: r.product_ndc,
            error: String(err),
          });
          result.errors++;
          result.skipped++;
        }
      }

      skip += pageSize;
      if (skip >= page.total) break;
    }

    logger.info("catalog-sync: OpenFDA sync complete", result);
    return result;
  }

  /**
   * Sync cosmetics from Open Beauty Facts.
   * @param maxItems  Cap on total items to process (default 2 000 per call)
   */
  async syncFromOpenBeauty(maxItems = 2_000): Promise<SyncResult> {
    const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: 0, total: 0 };
    const pageSize = 100;
    let page = 1;
    let fetched = 0;

    logger.info("catalog-sync: starting Open Beauty Facts sync", { maxItems });

    while (fetched < maxItems) {
      let batch: { products: any[]; count: number };
      try {
        batch = await fetchOpenBeautyPage(page, pageSize);
      } catch (err) {
        logger.error("catalog-sync: Open Beauty Facts fetch error", { page, error: String(err) });
        result.errors++;
        break;
      }

      if (batch.products.length === 0) break;

      for (const p of batch.products) {
        if (fetched >= maxItems) break;
        fetched++;
        result.total++;

        try {
          const payload = mapOpenBeautyResult(p);
          if (!payload) { result.skipped++; continue; }
          const { wasCreated } = await this.repository.upsertFromSource(payload);
          wasCreated ? result.added++ : result.updated++;
        } catch (err) {
          logger.warn("catalog-sync: Open Beauty Facts item error", {
            code: p.code,
            error: String(err),
          });
          result.errors++;
          result.skipped++;
        }
      }

      page++;
      if (fetched >= batch.count) break;
    }

    logger.info("catalog-sync: Open Beauty Facts sync complete", result);
    return result;
  }

  /**
   * Import medicines from an EDA-format CSV file.
   * @param filePath  Absolute path to the CSV (uploaded or placed on server)
   */
  async syncFromEDA(filePath: string): Promise<SyncResult> {
    const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: 0, total: 0 };

    logger.info("catalog-sync: starting EDA sync", { filePath });

    let rows: EdaRow[];
    try {
      rows = await parseEdaCsv(filePath);
    } catch (err) {
      logger.error("catalog-sync: EDA CSV parse error", { filePath, error: String(err) });
      throw err; // surface this — bad file path is a caller error
    }

    for (const row of rows) {
      result.total++;
      try {
        const payload = mapEdaRow(row);
        if (!payload) { result.skipped++; continue; }
        const { wasCreated } = await this.repository.upsertFromSource(payload);
        wasCreated ? result.added++ : result.updated++;
      } catch (err) {
        logger.warn("catalog-sync: EDA row error", {
          reg_no: row.reg_no,
          error: String(err),
        });
        result.errors++;
        result.skipped++;
      }
    }

    logger.info("catalog-sync: EDA sync complete", result);
    return result;
  }
}

export const catalogSyncService = new CatalogSyncService(catalogRepository);
