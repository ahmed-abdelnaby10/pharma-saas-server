import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";
import { z } from "zod";

dotenv.config();

const BooleanFromEnv = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }

  return value;
}, z.boolean());

type JwtExpiry = NonNullable<SignOptions["expiresIn"]>;

const durationSchema = z.custom<JwtExpiry>(
  (value) =>
    (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isFinite(value) && value > 0),
  "Invalid duration format",
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(8080),

  DATABASE_URL: z.string().min(1),

  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(5),
  DATABASE_POOL_IDLE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(30_000),
  DATABASE_POOL_CONNECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(10_000),

  REDIS_URL: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  CORS_ORIGIN: z.string().trim().min(1).default("*"),

  JWT_ACCESS_SECRET: z
    .string()
    .min(10, "JWT_ACCESS_SECRET must be at least 10 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(10, "JWT_REFRESH_SECRET must be at least 10 characters"),
  JWT_ACCESS_EXPIRES_IN: durationSchema,
  JWT_REFRESH_EXPIRES_IN: durationSchema,
  JWT_PASSWORD_RESET_SECRET: z
    .string()
    .min(10, "JWT_PASSWORD_RESET_SECRET must be at least 10 characters")
    .optional(),
  PASSWORD_RESET_TOKEN_EXPIRES_IN: durationSchema.default("15m"),
  PASSWORD_RESET_OTP_EXPIRES_IN_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(60)
    .default(10),
  PASSWORD_RESET_OTP_MAX_ATTEMPTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5),

  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_SECURE: BooleanFromEnv.default(false),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASS: z.string().trim().optional(),
  EMAIL_FROM: z.string().trim().optional(),
  DEFAULT_LANGUAGE: z.enum(["en", "ar"]).default("en"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().positive().default(10),

  APP_NAME: z.string().default("Pharmacy SaaS"),
  APP_URL: z.string().url().default("http://localhost:8080"),

  // Google Gemini — required for real OCR extraction
  GOOGLE_API_KEY: z.string().min(1),
  GEMINI_OCR_MODEL: z.string().min(1).default("gemini-2.5-flash"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = z.treeifyError(parsed.error);

  console.error("Invalid environment variables:", errors);
  process.exit(1);
}

export const env = parsed.data;
