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

// ── Egyptian Pharmacy CSV (Kaggle-format) ────────────────────────────────────
// Primary Egyptian bootstrap source. Use the Kaggle dataset
// "Medicines from Egyptian Pharmacies" (younaniskander) — it's scraped from
// real pharmacy sales so it covers both EDA-registered AND imported drugs
// that the official EDA registry doesn't list.
//
// Expected CSV columns (headers from the Kaggle dataset, case-insensitive
// thanks to the normalization below):
//   Drug Name, Price, Form, Company, Category, Region, Date, Time
//
// The legacy `reg_no, nameEn, nameAr, ...` EDA-style schema is also still
// accepted by the same endpoint — we auto-detect by checking which columns
// are present on the first row.

type RawCsvRow = Record<string, string | undefined>;

async function parseCatalogCsv(filePath: string): Promise<RawCsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: RawCsvRow[] = [];
    createReadStream(filePath)
      .pipe(
        parseCsv({
          columns:          (header: string[]) =>
            // normalize headers: lowercase + spaces → underscores
            header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_")),
          skip_empty_lines: true,
          trim:             true,
          bom:              true,
        }),
      )
      .on("data", (row: RawCsvRow) => rows.push(row))
      .on("end",  () => resolve(rows))
      .on("error", reject);
  });
}

/**
 * Map a row from the Kaggle "Medicines from Egyptian Pharmacies" CSV.
 * Columns (after header normalization): drug_name, price, form, company,
 * category, region, date, time.
 *
 * The CSV may legitimately contain duplicate rows (same drug across multiple
 * sales). We dedup by `drug_name + form + company` and route them all to the
 * same sourceId so upsert collapses duplicates.
 */
function mapKagglePharmacyRow(row: RawCsvRow): UpsertCatalogItemPayload | null {
  const drugName = row.drug_name?.trim();
  if (!drugName) return null;

  const form         = row.form?.trim()    || null;
  const company      = row.company?.trim() || null;
  const category     = row.category?.trim()|| null;

  // Build a stable dedup key: drug_name + form + company (lowercased)
  const dedupKey = [drugName, form ?? "", company ?? ""]
    .join("|")
    .toLowerCase()
    .replace(/\s+/g, " ");

  return {
    sourceId:             `kaggle_pharmacy:${dedupKey}`,
    source:               "KAGGLE_PHARMACY",
    nameEn:               drugName,
    nameAr:               drugName, // no Arabic in this dataset — crowdsource fills later
    manufacturer:         company,
    dosageForm:           form,
    category,
    unitOfMeasure:        "unit",
    productType:          "MEDICINE",
    requiresPrescription: false, // unknown — defaults false
    isActive:             true,
  };
}

/**
 * Legacy EDA-format mapper. Kept for backward compatibility with any
 * EDA-style CSV that genuinely has reg_no + nameAr/nameEn columns.
 */
function mapEdaRow(row: RawCsvRow): UpsertCatalogItemPayload | null {
  const regNo = row.reg_no?.trim();
  const nameEn = row.nameen?.trim() || row.name_en?.trim();
  if (!regNo || !nameEn) return null;

  const flag = row.requiresprescription?.trim() ?? row.requires_prescription?.trim();
  const requiresPrescription = flag?.toLowerCase() === "yes" || flag === "1";

  return {
    sourceId:             `eda:${regNo}`,
    source:               "EDA",
    nameEn,
    nameAr:               row.namear?.trim() || row.name_ar?.trim() || nameEn,
    genericNameEn:        row.genericnameen?.trim() || row.generic_name_en?.trim() || null,
    genericNameAr:        row.genericnamear?.trim() || row.generic_name_ar?.trim() || null,
    manufacturer:         row.manufacturer?.trim() || null,
    dosageForm:           row.dosageform?.trim()   || row.dosage_form?.trim() || null,
    strength:             row.strength?.trim()     || null,
    category:             row.category?.trim()     || null,
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
   * Import Egyptian medicines from a CSV file on the server.
   *
   * Auto-detects the format by inspecting the first row's column names:
   *
   * - **Kaggle "Medicines from Egyptian Pharmacies"** (primary path) — recognised
   *   by the presence of a `drug_name` column. Covers BOTH EDA-registered AND
   *   imported drugs because it's scraped from real pharmacy stock.
   * - **EDA-style** (legacy) — recognised by a `reg_no` column. Use only if you
   *   somehow obtain an official EDA-format CSV (the EDA does not publish one).
   *
   * @param filePath  Absolute path to the CSV file on the server
   */
  async syncFromEDA(filePath: string): Promise<SyncResult> {
    const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: 0, total: 0 };

    logger.info("catalog-sync: starting Egyptian CSV sync", { filePath });

    let rows: RawCsvRow[];
    try {
      rows = await parseCatalogCsv(filePath);
    } catch (err) {
      logger.error("catalog-sync: CSV parse error", { filePath, error: String(err) });
      throw err; // surface this — bad file path is a caller error
    }

    if (rows.length === 0) {
      logger.warn("catalog-sync: CSV file is empty", { filePath });
      return result;
    }

    // Detect format from the first row's headers
    const firstRow = rows[0];
    const isKaggleFormat = "drug_name" in firstRow;
    const isEdaFormat    = "reg_no"    in firstRow;
    const mapRow         = isKaggleFormat ? mapKagglePharmacyRow : mapEdaRow;
    const formatLabel    = isKaggleFormat ? "kaggle_pharmacy" : "eda";

    if (!isKaggleFormat && !isEdaFormat) {
      const headers = Object.keys(firstRow).join(", ");
      throw new Error(
        `Unrecognised CSV format. Expected either a 'drug_name' column ` +
        `(Kaggle dataset) or a 'reg_no' column (EDA dataset). Found: ${headers}`,
      );
    }

    logger.info("catalog-sync: detected CSV format", { format: formatLabel, rowCount: rows.length });

    for (const row of rows) {
      result.total++;
      try {
        const payload = mapRow(row);
        if (!payload) { result.skipped++; continue; }
        const { wasCreated } = await this.repository.upsertFromSource(payload);
        wasCreated ? result.added++ : result.updated++;
      } catch (err) {
        logger.warn("catalog-sync: row error", {
          format: formatLabel,
          row,
          error: String(err),
        });
        result.errors++;
        result.skipped++;
      }
    }

    logger.info("catalog-sync: Egyptian CSV sync complete", { format: formatLabel, ...result });
    return result;
  }
}

export const catalogSyncService = new CatalogSyncService(catalogRepository);
