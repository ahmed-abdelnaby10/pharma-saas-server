import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { InvoiceExtractor } from "./ocr-extractor.interface";
import { InvoiceExtractedData } from "./invoice-extracted-data.type";
import { env } from "../../../../core/config/env";
import { logger } from "../../../../core/logger/logger";

// ── Zod schema — validation safety net after Gemini extraction ───────────────

const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
});

const InvoiceExtractionSchema = z.object({
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  supplierName: z.string().nullable(),
  supplierTaxId: z.string().nullable(),
  lineItems: z.array(LineItemSchema),
  subtotal: z.number().nullable(),
  vatAmount: z.number().nullable(),
  totalAmount: z.number().nullable(),
  currency: z.string(),
  confidence: z.number().min(0).max(1),
});

// ── Gemini responseSchema (Type.* format) ────────────────────────────────────

const INVOICE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    invoiceNumber: { type: Type.STRING, nullable: true },
    invoiceDate: { type: Type.STRING, nullable: true, description: "ISO date YYYY-MM-DD or null" },
    supplierName: { type: Type.STRING, nullable: true },
    supplierTaxId: { type: Type.STRING, nullable: true },
    lineItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unitPrice: { type: Type.NUMBER },
          total: { type: Type.NUMBER },
        },
        required: ["description", "quantity", "unitPrice", "total"],
      },
    },
    subtotal: { type: Type.NUMBER, nullable: true },
    vatAmount: { type: Type.NUMBER, nullable: true },
    totalAmount: { type: Type.NUMBER, nullable: true },
    currency: { type: Type.STRING, description: "ISO 4217 currency code, e.g. SAR, USD" },
    confidence: {
      type: Type.NUMBER,
      description: "Overall extraction confidence from 0 to 1",
    },
  },
  required: [
    "invoiceNumber",
    "invoiceDate",
    "supplierName",
    "supplierTaxId",
    "lineItems",
    "subtotal",
    "vatAmount",
    "totalAmount",
    "currency",
    "confidence",
  ],
};

// ── System prompt ─────────────────────────────────────────────────────────────

const INVOICE_SYSTEM_PROMPT = `You are a pharmacy invoice OCR specialist.
Extract structured data from the provided invoice document (image or PDF).

Rules:
- Extract ALL line items you can find; do not summarise or merge rows.
- Dates must be returned as ISO 8601 (YYYY-MM-DD). If the year is ambiguous use the most plausible one.
- Monetary values must be plain numbers (no currency symbols, no commas).
- currency: return the ISO 4217 code (e.g. SAR, USD, EUR). Default to SAR if unclear.
- If a field is not present or illegible, return null.
- confidence: a float from 0 (nothing readable) to 1 (perfect clarity). Be honest.`;

// ── Extractor ─────────────────────────────────────────────────────────────────

export class GeminiInvoiceExtractor implements InvoiceExtractor {
  private client: GoogleGenAI;
  private model: string;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
    this.model = env.GEMINI_OCR_MODEL;
  }

  async extract(absoluteFilePath: string, mimeType: string): Promise<InvoiceExtractedData> {
    const fileBuffer = fs.readFileSync(absoluteFilePath);
    const base64Data = fileBuffer.toString("base64");

    logger.info("GeminiInvoiceExtractor: calling Gemini Vision", {
      model: this.model,
      mimeType,
      fileSizeBytes: fileBuffer.length,
    });

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: "Extract the invoice data from this document and return it as structured JSON.",
            },
          ],
        },
      ],
      config: {
        systemInstruction: INVOICE_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: INVOICE_RESPONSE_SCHEMA,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("GeminiInvoiceExtractor: empty response from Gemini");
    }

    // Zod validation as safety net in case Gemini deviates from schema
    const parsed = InvoiceExtractionSchema.parse(JSON.parse(rawText));

    logger.info("GeminiInvoiceExtractor: extraction complete", {
      invoiceNumber: parsed.invoiceNumber,
      lineItemCount: parsed.lineItems.length,
      confidence: parsed.confidence,
    });

    return parsed;
  }
}

export const geminiInvoiceExtractor = new GeminiInvoiceExtractor();
