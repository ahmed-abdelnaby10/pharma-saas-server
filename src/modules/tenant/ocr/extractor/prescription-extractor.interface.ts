import { PrescriptionExtractedData } from "./prescription-extracted-data.type";

/**
 * Pluggable prescription extractor interface.
 * Swap implementations via env / DI to use Google Vision, AWS Textract,
 * Anthropic Claude vision, or any other OCR backend.
 */
export interface PrescriptionExtractor {
  extract(absoluteFilePath: string, mimeType: string): Promise<PrescriptionExtractedData>;
}
