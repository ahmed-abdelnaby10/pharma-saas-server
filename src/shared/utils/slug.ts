import { prisma } from "../../core/db/prisma";

/**
 * Converts any string into a URL-safe slug.
 *   "Green Valley Pharmacy"  →  "green-valley-pharmacy"
 *   "Al-Nile Pharmacy"       →  "al-nile-pharmacy"
 * Arabic-only text produces an empty string — callers must supply a fallback.
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")               // decompose accented chars (é → e + combining accent)
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9\s-]/g, "")  // keep only alphanumeric, spaces, hyphens
    .replace(/[\s_]+/g, "-")        // spaces / underscores → hyphen
    .replace(/-+/g, "-")            // collapse consecutive hyphens
    .replace(/^-|-$/g, "");         // trim leading / trailing hyphens
}

/**
 * Generates a globally unique tenant slug derived from the pharmacy's English name.
 *
 * Strategy:
 *   1. Derive base slug from pharmacyNameEn.
 *   2. If the base is already taken, try base-2, base-3 … base-99.
 *   3. Fall back to base + first 8 chars of a new cuid (extremely unlikely).
 *
 * @example
 *   "Green Valley Pharmacy"  →  "green-valley-pharmacy"
 *   (if taken)               →  "green-valley-pharmacy-2"
 */
export async function generateUniqueTenantSlug(pharmacyNameEn: string): Promise<string> {
  const base = toSlug(pharmacyNameEn) || "pharmacy"; // Arabic-only names fall back to "pharmacy"

  const taken = async (slug: string): Promise<boolean> =>
    !!(await prisma.tenant.findUnique({ where: { slug } }));

  if (!(await taken(base))) return base;

  for (let n = 2; n <= 99; n++) {
    const candidate = `${base}-${n}`;
    if (!(await taken(candidate))) return candidate;
  }

  // Extremely unlikely: append a random 8-char suffix
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${base}-${suffix}`;
}
