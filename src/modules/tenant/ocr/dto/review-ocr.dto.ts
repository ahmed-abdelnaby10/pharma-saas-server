export interface ReviewOcrDto {
  /** Optional corrected/overridden extracted data. Replaces extractedData if provided. */
  correctedData?: Record<string, unknown>;
}
