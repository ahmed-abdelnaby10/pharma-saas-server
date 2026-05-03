import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PrescriptionExtractor } from "./prescription-extractor.interface";
import { PrescriptionExtractedData } from "./prescription-extracted-data.type";
import { env } from "../../../../core/config/env";
import { logger } from "../../../../core/logger/logger";

// ── Zod schema mirroring PrescriptionExtractedData ──────────────────────────

const MedicationSchema = z.object({
  name: z.string().describe("Drug name as written on the prescription"),
  dosage: z.string().describe("e.g. 500mg, 10mg/5ml"),
  frequency: z.string().describe("e.g. twice daily, every 8 hours"),
  duration: z.string().nullable().describe("e.g. 7 days, 2 weeks, or null"),
  quantity: z
    .number()
    .nullable()
    .describe("Total units dispensed, or null if not stated"),
  instructions: z
    .string()
    .nullable()
    .describe("Special instructions such as take with food, or null"),
});

const PrescriptionSchema = z.object({
  patientName: z.string().nullable(),
  patientDateOfBirth: z
    .string()
    .nullable()
    .describe("ISO date YYYY-MM-DD or null"),
  doctorName: z.string().nullable(),
  doctorLicenseNumber: z.string().nullable(),
  prescriptionDate: z
    .string()
    .nullable()
    .describe("ISO date YYYY-MM-DD or null"),
  medications: z.array(MedicationSchema),
  notes: z
    .string()
    .nullable()
    .describe("Any additional clinical notes on the prescription"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Your overall extraction confidence from 0 to 1"),
});

// ── Stable system prompt (cached) ───────────────────────────────────────────

const PRESCRIPTION_SYSTEM_PROMPT = `You are a pharmacy prescription OCR specialist.
Extract structured data from the provided prescription document (image or PDF).

Rules:
- Extract EVERY medication listed; do not skip or merge entries.
- Dates must be returned as ISO 8601 (YYYY-MM-DD). If the year is ambiguous use the most plausible one.
- dosage: include units (mg, ml, etc.) exactly as written.
- frequency: normalise common abbreviations — "BD" to "twice daily", "TDS" to "three times daily", "QDS" to "four times daily", "PRN" to "as needed".
- quantity: numeric units count (e.g. 30 tablets). Return null if not stated.
- If a field is not present or illegible, return null.
- confidence: a float from 0 (nothing readable) to 1 (perfect clarity). Be honest.
- Respond ONLY with the JSON object matching the schema — no prose, no markdown fences.`;

// ── Extractor ────────────────────────────────────────────────────────────────

export class AnthropicPrescriptionExtractor implements PrescriptionExtractor {
  private client: Anthropic;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set — cannot use AnthropicPrescriptionExtractor",
      );
    }
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async extract(
    absoluteFilePath: string,
    mimeType: string,
  ): Promise<PrescriptionExtractedData> {
    const fileBuffer = fs.readFileSync(absoluteFilePath);
    const base64Data = fileBuffer.toString("base64");

    const fileContent = this.buildFileContent(base64Data, mimeType);

    logger.info("AnthropicPrescriptionExtractor: calling Claude Vision", {
      mimeType,
      fileSizeBytes: fileBuffer.length,
    });

    const response = await this.client.messages.parse({
      model: "claude-opus-4-7",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: PRESCRIPTION_SYSTEM_PROMPT,
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
              text: "Extract the prescription data from this document and return it as structured JSON.",
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(PrescriptionSchema),
      },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new Error("AnthropicPrescriptionExtractor: parsed_output is empty");
    }

    logger.info("AnthropicPrescriptionExtractor: extraction complete", {
      patientName: parsed.patientName,
      medicationCount: parsed.medications.length,
      confidence: parsed.confidence,
    });

    return parsed;
  }

  private buildFileContent(
    base64Data: string,
    mimeType: string,
  ):
    | Anthropic.Messages.ImageBlockParam
    | Anthropic.Messages.DocumentBlockParam {
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

    return {
      type: "image",
      source: {
        type: "base64",
        media_type: mimeType as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp",
        data: base64Data,
      },
    };
  }
}

export const anthropicPrescriptionExtractor =
  new AnthropicPrescriptionExtractor();
