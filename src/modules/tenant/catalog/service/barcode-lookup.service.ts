/**
 * BarcodeLookupService
 *
 * Calls external barcode databases when a cashier scans a code that isn't in
 * our catalog yet. Tries free providers in priority order and returns the
 * first hit as a normalized payload ready for `repository.suggestFromTenant`.
 *
 * Providers (priority order):
 *   1. OpenFDA NDC          — best for US-registered medicines (~15-25% of Egyptian stock)
 *   2. Open Beauty Facts    — best for cosmetics (~2.5M global products)
 *   3. Verified by GS1      — official source, but in practice the public web
 *                              endpoint has anti-bot/captcha protection and the
 *                              GEPIR API requires registration. Provider is
 *                              wired in but disabled by default — set
 *                              GS1_LOOKUP_URL env var to enable a custom proxy.
 *
 * Returns `null` when no provider has a hit — caller decides what to do.
 */

import { logger } from "../../../../core/logger/logger";
import { env } from "../../../../core/config/env";

export type CatalogProductTypeHint =
  | "MEDICINE"
  | "COSMETIC"
  | "SUPPLEMENT"
  | "MEDICAL_DEVICE"
  | "OTHER";

export interface BarcodeLookupResult {
  provider:       "openfda" | "openbeauty" | "gs1";
  barcode:        string;
  nameEn:         string;
  nameAr?:        string | null;
  genericNameEn?: string | null;
  manufacturer?:  string | null;
  dosageForm?:    string | null;
  strength?:      string | null;
  category?:      string | null;
  productType:    CatalogProductTypeHint;
  requiresPrescription?: boolean;
  imageUrl?:      string | null;
  /** Raw provider response for debugging (not surfaced to client) */
  raw?:           unknown;
}

// ── OpenFDA ───────────────────────────────────────────────────────────────────

async function lookupOpenFDA(barcode: string): Promise<BarcodeLookupResult | null> {
  // OpenFDA stores NDC in formats like "0000-0000" or "0000-0000-00".
  // We match the package_ndc field — it accepts the barcode with or without hyphens.
  const url =
    `https://api.fda.gov/drug/ndc.json` +
    `?search=packaging.package_ndc:"${encodeURIComponent(barcode)}"` +
    `&limit=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const r = data.results?.[0];
    if (!r) return null;

    const brand   = r.brand_name   ?? r.proprietary_name    ?? null;
    const generic = r.generic_name ?? r.nonproprietary_name ?? brand;
    if (!brand && !generic) return null;

    return {
      provider:       "openfda",
      barcode,
      nameEn:         brand || generic!,
      genericNameEn:  generic !== brand ? generic : null,
      manufacturer:   r.labeler_name ?? null,
      dosageForm:     r.dosage_form  ?? null,
      strength:       r.route?.[0]   ?? null,
      category:       r.product_type ?? null,
      productType:    "MEDICINE",
      requiresPrescription: false, // can't reliably determine
      raw:            r,
    };
  } catch (err) {
    logger.warn("barcode-lookup: OpenFDA error", { barcode, error: String(err) });
    return null;
  }
}

// ── Open Beauty Facts ─────────────────────────────────────────────────────────

async function lookupOpenBeauty(barcode: string): Promise<BarcodeLookupResult | null> {
  const url = `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    // status === 1 means the product was found
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const nameEn =
      p.product_name_en ||
      p.product_name    ||
      p.brands          ||
      null;
    if (!nameEn) return null;

    return {
      provider:       "openbeauty",
      barcode,
      nameEn,
      nameAr:         p.product_name_ar || null,
      manufacturer:   p.brands          || null,
      category:       p.categories?.split(",")[0]?.trim() || null,
      productType:    "COSMETIC",
      imageUrl:       p.image_url       || null,
      requiresPrescription: false,
      raw:            p,
    };
  } catch (err) {
    logger.warn("barcode-lookup: Open Beauty Facts error", { barcode, error: String(err) });
    return null;
  }
}

// ── Verified by GS1 (configurable proxy) ─────────────────────────────────────
//
// The public web form at `gs1.org/services/verified-by-gs1/results` is
// protected against scraping. The official `gepir.gs1.org` REST API requires
// registration and an API key. To keep this provider pluggable we read
// `GS1_LOOKUP_URL` from env — if set, we issue a GET request to:
//
//   `${GS1_LOOKUP_URL}?gtin=${barcode}`
//
// expecting a JSON response of shape:
//   { brandName, productDescription, gpcCategoryDescription, netContent, ... }
//
// This lets you point at a custom proxy / Cloud Function / paid third-party
// barcode API without code changes. If `GS1_LOOKUP_URL` is unset (default),
// this provider is skipped.

async function lookupGS1(barcode: string): Promise<BarcodeLookupResult | null> {
  const baseUrl = env.GS1_LOOKUP_URL;
  if (!baseUrl) return null; // provider disabled

  const url = `${baseUrl}?gtin=${encodeURIComponent(barcode)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;

    const nameEn = data.brandName || data.productDescription || null;
    if (!nameEn) return null;

    return {
      provider:       "gs1",
      barcode,
      nameEn,
      manufacturer:   data.companyName || data.licenseHolder || null,
      category:       data.gpcCategoryDescription || null,
      productType:    "MEDICINE", // GS1 doesn't classify pharma vs. cosmetics — caller can revise
      requiresPrescription: false,
      raw:            data,
    };
  } catch (err) {
    logger.warn("barcode-lookup: GS1 error", { barcode, error: String(err) });
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export class BarcodeLookupService {
  /**
   * Try each provider in priority order and return the first hit.
   * Order matters: OpenFDA first (most useful for medicines), then OBF
   * (cosmetics), then GS1 if configured.
   */
  async lookup(barcode: string): Promise<BarcodeLookupResult | null> {
    const providers = [lookupOpenFDA, lookupOpenBeauty, lookupGS1];
    for (const provider of providers) {
      const result = await provider(barcode);
      if (result) {
        logger.info("barcode-lookup: hit", {
          barcode,
          provider: result.provider,
          nameEn:   result.nameEn,
        });
        return result;
      }
    }
    logger.info("barcode-lookup: no hit", { barcode });
    return null;
  }
}

export const barcodeLookupService = new BarcodeLookupService();
