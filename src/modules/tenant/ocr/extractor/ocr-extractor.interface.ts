import { InvoiceExtractedData } from "./invoice-extracted-data.type";

/**
 * Pluggable invoice extractor interface.
 * Swap implementations via env / DI to use Google Vision, AWS Textract,
 * Anthropic Claude vision, or any other OCR backend.
 */
export interface InvoiceExtractor {
  extract(absoluteFilePath: string, mimeType: string): Promise<InvoiceExtractedData>;
}
