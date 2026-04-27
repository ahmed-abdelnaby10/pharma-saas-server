import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { InvoiceExtractor } from "./ocr-extractor.interface";
import { InvoiceExtractedData } from "./invoice-extracted-data.type";
import { env } from "../../../../core/config/env";
import { logger } from "../../../../core/logger/logger";

// ── Zod schema mirroring InvoiceExtractedData ────────────────────────────────

const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
});

const InvoiceSchema = z.object({
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable().describe("ISO date YYYY-MM-DD or null"),
  supplierName: z.string().nullable(),
  supplierTaxId: z.string().nullable(),
  lineItems: z.array(LineItemSchema),
  subtotal: z.number().nullable(),
  vatAmount: z.number().nullable(),
  totalAmount: z.number().nullable(),
  currency: z.string().describe("ISO 4217 currency code, e.g. SAR, USD"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Your overall extraction confidence from 0 to 1"),
});

// ── Stable system prompt (cached) ───────────────────────────────────────────

const INVOICE_SYSTEM_PROMPT = `You are a pharmacy invoice OCR specialist.
Extract structured data from the provided invoice document (image or PDF).

Rules:
- Extract ALL line items you can find; do not summarise or merge rows.
- Dates must be returned as ISO 8601 (YYYY-MM-DD). If the year is ambiguous use the most plausible one.
- Monetary values must be plain numbers (no currency symbols, no commas).
- currency: return the ISO 4217 code (e.g. SAR, USD, EUR). Default to SAR if unclear.
- If a field is not present or illegible, return null.
- confidence: a float from 0 (nothing readable) to 1 (perfect clarity). Be honest.
- Respond ONLY with the JSON object matching the schema — no prose, no markdown fences.`;

// ── Extractor ────────────────────────────────────────────────────────────────

export class AnthropicInvoiceExtractor implements InvoiceExtractor {
  private client: Anthropic;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set — cannot use AnthropicInvoiceExtractor",
      );
    }
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async extract(absoluteFilePath: string, mimeType: string): Promise<InvoiceExtractedData> {
    const fileBuffer = fs.readFileSync(absoluteFilePath);
    const base64Data = fileBuffer.toString("base64");

    const fileContent = this.buildFileContent(base64Data, mimeType);

    logger.info("AnthropicInvoiceExtractor: calling Claude Vision", {
      mimeType,
      fileSizeBytes: fileBuffer.length,
    });

    // messages.parse() validates the response against the Zod schema
    // and exposes parsed_output directly
    const response = await this.client.messages.parse({
      model: "claude-opus-4-7",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: INVOICE_SYSTEM_PROMPT,
          // Prompt caching — stable system prompt is cached across calls
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            fileContent,
            {
              type: "text",
              text: "Extract the invoice data from this document and return it as structured JSON.",
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(InvoiceSchema),
      },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new Error("AnthropicInvoiceExtractor: parsed_output is empty");
    }

    logger.info("AnthropicInvoiceExtractor: extraction complete", {
      invoiceNumber: parsed.invoiceNumber,
      lineItemCount: parsed.lineItems.length,
      confidence: parsed.confidence,
    });

    return parsed;
  }

  private buildFileContent(
    base64Data: string,
    mimeType: string,
  ): Anthropic.Messages.ImageBlockParam | Anthropic.Messages.DocumentBlockParam {
    if (mimeType === "application/pdf") {
      return {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64Data,
        },
      };
    }

    // image/jpeg | image/png | image/gif | image/webp
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: base64Data,
      },
    };
  }
}

export const anthropicInvoiceExtractor = new AnthropicInvoiceExtractor();
