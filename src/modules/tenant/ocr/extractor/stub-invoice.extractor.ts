import { InvoiceExtractor } from "./ocr-extractor.interface";
import { InvoiceExtractedData } from "./invoice-extracted-data.type";

/**
 * Stub extractor — returns plausible-looking invoice data without calling
 * any external OCR service. Used in development and tests.
 * Replace with a real implementation (e.g. AnthropicInvoiceExtractor,
 * GoogleVisionInvoiceExtractor) by binding a different instance.
 */
export class StubInvoiceExtractor implements InvoiceExtractor {
  async extract(_absoluteFilePath: string, _mimeType: string): Promise<InvoiceExtractedData> {
    // Simulate brief processing time
    await new Promise((resolve) => setTimeout(resolve, 300));

    const today = new Date().toISOString().split("T")[0]!;

    return {
      invoiceNumber: "INV-STUB-001",
      invoiceDate: today,
      supplierName: "Stub Pharma Supplier",
      supplierTaxId: "300-000-0000",
      lineItems: [
        { description: "Paracetamol 500mg × 100", quantity: 10, unitPrice: 5.0, total: 50.0 },
        { description: "Amoxicillin 250mg × 30", quantity: 5, unitPrice: 12.0, total: 60.0 },
      ],
      subtotal: 110.0,
      vatAmount: 16.5,
      totalAmount: 126.5,
      currency: "SAR",
      confidence: 0, // 0 = stub — not real extraction
    };
  }
}

export const stubInvoiceExtractor = new StubInvoiceExtractor();
