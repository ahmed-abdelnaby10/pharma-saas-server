# OCR Providers

## Current Provider: Google Gemini 2.5 Flash

### Why Gemini?

| Metric | Anthropic Claude Opus | Google Gemini 2.5 Flash |
|--------|----------------------|-------------------------|
| Input cost (image) | ~$5.00 / 1M tokens | ~$0.075 / 1M tokens |
| Output cost | ~$25.00 / 1M tokens | ~$0.30 / 1M tokens |
| Cost reduction | baseline | ~95% cheaper |
| PDF native support | Yes (document block) | Yes (inlineData) |
| Arabic OCR | Good | Good |
| JSON schema output | `zodOutputFormat` | `responseSchema` + `Type.*` |

### Configuration

| Env var | Required | Default | Description |
|---------|----------|---------|-------------|
| `GOOGLE_API_KEY` | ✅ | — | Google AI Studio or Vertex key |
| `GEMINI_OCR_MODEL` | ❌ | `gemini-2.5-flash` | Model override (e.g. `gemini-2.0-flash`) |

### Confidence Threshold

The workers notify users when confidence ≥ `0.85`. Gemini 2.5 Flash is well-calibrated at high-confidence; values below 0.85 indicate genuinely ambiguous documents and warrant human review.

### Extractor Files

| File | Interface |
|------|-----------|
| `src/modules/tenant/ocr/extractor/gemini-invoice.extractor.ts` | `InvoiceExtractor` |
| `src/modules/tenant/ocr/extractor/gemini-prescription.extractor.ts` | `PrescriptionExtractor` |

Both follow the same pattern:
1. Read file → base64
2. `client.models.generateContent()` with `inlineData` + `responseSchema` (structured output)
3. `JSON.parse(response.text)` → Zod validation as safety net
4. Return typed `InvoiceExtractedData` / `PrescriptionExtractedData`

### Switching Providers

To swap to a different provider:
1. Implement the `InvoiceExtractor` and/or `PrescriptionExtractor` interfaces
2. Export a singleton from the new extractor file
3. Update the import in `ocr-invoice.processor.ts` and `ocr-prescription.processor.ts`
4. Update `env.ts` with the new provider's API key field
5. Update this doc

Interfaces are in:
- `src/modules/tenant/ocr/extractor/ocr-extractor.interface.ts`
- `src/modules/tenant/ocr/extractor/prescription-extractor.interface.ts`
