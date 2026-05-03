import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { PrescriptionExtractor } from "./prescription-extractor.interface";
import { PrescriptionExtractedData } from "./prescription-extracted-data.type";
import { env } from "../../../../core/config/env";
import { logger } from "../../../../core/logger/logger";

// ── Zod schema — validation safety net after Gemini extraction ───────────────

const MedicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string().nullable(),
  quantity: z.number().nullable(),
  instructions: z.string().nullable(),
});

const PrescriptionExtractionSchema = z.object({
  patientName: z.string().nullable(),
  patientDateOfBirth: z.string().nullable(),
  doctorName: z.string().nullable(),
  doctorLicenseNumber: z.string().nullable(),
  prescriptionDate: z.string().nullable(),
  medications: z.array(MedicationSchema),
  notes: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

// ── Gemini responseSchema (Type.* format) ────────────────────────────────────

const PRESCRIPTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    patientName: { type: Type.STRING, nullable: true },
    patientDateOfBirth: {
      type: Type.STRING,
      nullable: true,
      description: "ISO date YYYY-MM-DD or null",
    },
    doctorName: { type: Type.STRING, nullable: true },
    doctorLicenseNumber: { type: Type.STRING, nullable: true },
    prescriptionDate: {
      type: Type.STRING,
      nullable: true,
      description: "ISO date YYYY-MM-DD or null",
    },
    medications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Drug name as written on the prescription" },
          dosage: { type: Type.STRING, description: "e.g. 500mg, 10mg/5ml" },
          frequency: { type: Type.STRING, description: "e.g. twice daily, every 8 hours" },
          duration: { type: Type.STRING, nullable: true, description: "e.g. 7 days, 2 weeks, or null" },
          quantity: {
            type: Type.NUMBER,
            nullable: true,
            description: "Total units dispensed, or null if not stated",
          },
          instructions: {
            type: Type.STRING,
            nullable: true,
            description: "Special instructions such as take with food, or null",
          },
        },
        required: ["name", "dosage", "frequency", "duration", "quantity", "instructions"],
      },
    },
    notes: {
      type: Type.STRING,
      nullable: true,
      description: "Any additional clinical notes on the prescription",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Overall extraction confidence from 0 to 1",
    },
  },
  required: [
    "patientName",
    "patientDateOfBirth",
    "doctorName",
    "doctorLicenseNumber",
    "prescriptionDate",
    "medications",
    "notes",
    "confidence",
  ],
};

// ── System prompt ─────────────────────────────────────────────────────────────

const PRESCRIPTION_SYSTEM_PROMPT = `You are a pharmacy prescription OCR specialist.
Extract structured data from the provided prescription document (image or PDF).

Rules:
- Extract EVERY medication listed; do not skip or merge entries.
- Dates must be returned as ISO 8601 (YYYY-MM-DD). If the year is ambiguous use the most plausible one.
- dosage: include units (mg, ml, etc.) exactly as written.
- frequency: normalise common abbreviations — "BD" to "twice daily", "TDS" to "three times daily",
  "QDS" to "four times daily", "PRN" to "as needed".
- Arabic abbreviations: "مرتين" to "twice daily", "ثلاث مرات" to "three times daily", "عند الحاجة" to "as needed".
- quantity: numeric units count (e.g. 30 tablets). Return null if not stated.
- If a field is not present or illegible, return null.
- confidence: a float from 0 (nothing readable) to 1 (perfect clarity). Be honest.`;

// ── Extractor ─────────────────────────────────────────────────────────────────

export class GeminiPrescriptionExtractor implements PrescriptionExtractor {
  private client: GoogleGenAI;
  private model: string;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });
    this.model = env.GEMINI_OCR_MODEL;
  }

  async extract(
    absoluteFilePath: string,
    mimeType: string,
  ): Promise<PrescriptionExtractedData> {
    const fileBuffer = fs.readFileSync(absoluteFilePath);
    const base64Data = fileBuffer.toString("base64");

    logger.info("GeminiPrescriptionExtractor: calling Gemini Vision", {
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
              text: "Extract the prescription data from this document and return it as structured JSON.",
            },
          ],
        },
      ],
      config: {
        systemInstruction: PRESCRIPTION_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: PRESCRIPTION_RESPONSE_SCHEMA,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("GeminiPrescriptionExtractor: empty response from Gemini");
    }

    // Zod validation as safety net in case Gemini deviates from schema
    const parsed = PrescriptionExtractionSchema.parse(JSON.parse(rawText));

    logger.info("GeminiPrescriptionExtractor: extraction complete", {
      patientName: parsed.patientName,
      medicationCount: parsed.medications.length,
      confidence: parsed.confidence,
    });

    return parsed;
  }
}

export const geminiPrescriptionExtractor = new GeminiPrescriptionExtractor();
