export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
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
