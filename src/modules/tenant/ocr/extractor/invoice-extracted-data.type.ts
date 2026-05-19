export interface InvoiceLineItem {
  description: string;
  /** Model's best-guess English / generic drug name (translated from Arabic when needed). Used for catalog matching. */
  nameEn?: string | null;
  quantity: number;
  unitPrice: number;
  /** Line-level discount as a percentage 0–100 (e.g. 29 = 29%). Null when no discount column exists. */
  discountPercent?: number | null;
  total: number;
  /** Batch / lot number printed on the invoice line (التشغيلة). Null when absent. */
  batchNumber?: string | null;
  /** Expiry date from the invoice line (الصلاحية) as ISO YYYY-MM-DD. Null when absent. */
  expiryDate?: string | null;
}

export interface InvoiceExtractedData {
  invoiceNumber: string | null;
  invoiceDate: string | null;       // ISO date string YYYY-MM-DD
  supplierName: string | null;
  supplierTaxId: string | null;
  lineItems: InvoiceLineItem[];
  subtotal: number | null;
  vatAmount: number | null;
  totalAmount: number | null;
  currency: string;
  /** Extraction confidence 0–1. 0 = stub/unknown. */
  confidence: number;
}
