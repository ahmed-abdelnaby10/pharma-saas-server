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
  nameEn: z.string().nullable().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  discountPercent: z.number().min(0).max(100).nullable().optional(),
  total: z.number(),
  batchNumber: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
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
          description: { type: Type.STRING, description: "Full product name as printed on the invoice (preserve original language)" },
          nameEn: { type: Type.STRING, nullable: true, description: "English or international generic drug name — translate from Arabic if needed, or null if unknown" },
          quantity: { type: Type.NUMBER },
          unitPrice: { type: Type.NUMBER, description: "Unit price before any discount" },
          discountPercent: { type: Type.NUMBER, nullable: true, description: "Line discount as a percentage 0–100 (e.g. column 'الخصم' value 29 means 29%). Null when absent." },
          total: { type: Type.NUMBER, description: "Final line total after discount" },
          batchNumber: { type: Type.STRING, nullable: true, description: "Batch / lot number from 'التشغيلة' column, or null" },
          expiryDate: { type: Type.STRING, nullable: true, description: "Expiry date from 'الصلاحية' column as ISO YYYY-MM-DD, or null" },
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

const INVOICE_SYSTEM_PROMPT = `You are a pharmacy invoice OCR specialist with expertise in Egyptian and Arabic pharmaceutical invoices.
Extract structured data from the provided invoice document (image or PDF).

Rules:
- Extract ALL line items you can find; do not summarise or merge rows.
- Dates must be returned as ISO 8601 (YYYY-MM-DD). If the year is ambiguous use the most plausible one.
- Monetary values must be plain numbers (no currency symbols, no commas).
- currency: return the ISO 4217 code (e.g. EGP, SAR, USD). Default to EGP for Egyptian invoices, SAR if unclear.
- If a field is not present or illegible, return null.
- confidence: a float from 0 (nothing readable) to 1 (perfect clarity). Be honest.

Per line item:
- description: copy the product name exactly as printed (Arabic or English).
- nameEn: provide the international English or generic drug name. If the description is Arabic, translate or identify the well-known English/generic equivalent (e.g. "فيسيرالجين اقراص سيديكو" → "Viseralgine tablets" or its generic "Metamizole"). If unknown, return null.
- discountPercent: if the invoice has a discount column (الخصم), extract the numeric value as a percentage (e.g. 29 = 29%). The formula is: total = unitPrice × quantity × (1 - discountPercent/100). Return null if no discount column.
- batchNumber: extract the batch/lot number from the التشغيلة column. Return null if absent or "NULL".
- expiryDate: extract the expiry date from الصلاحية column and convert to ISO YYYY-MM-DD. Return null if absent.`;

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
