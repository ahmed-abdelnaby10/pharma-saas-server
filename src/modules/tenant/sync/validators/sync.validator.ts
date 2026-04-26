import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";

export const bootstrapQuerySchema = z.object({
  branchId: z.string().cuid("Invalid branchId"),
});

export const deltaQuerySchema = z.object({
  branchId: z.string().cuid("Invalid branchId"),
  since: z.string().datetime({ offset: true }),
});

const pushOperationSchema = z.object({
  externalId: z.string().min(1).max(128),
  type: z.union([
    z.literal("sale"),
    z.literal("shift_open"),
    z.literal("shift_close"),
    z.literal("stock_movement"),
  ]),
  payload: z.record(z.string(), z.unknown()),
});

export const pushBodySchema = z.object({
  operations: z.array(pushOperationSchema).min(1).max(100),
});

const deviceSchema = z.object({
  branchId: z.string().cuid("Invalid branchId"),
  fingerprint: z.string().min(8).max(256),
  label: z.string().max(100).nullish(),
});

const deviceIdParamSchema = z.object({
  deviceId: z.string().cuid("Invalid deviceId"),
});

const parse = <T>(schema: z.ZodType<T>, input: unknown): T => {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};

export const parseBootstrapQuery = (q: unknown) => parse(bootstrapQuerySchema, q);
export const parseDeltaQuery = (q: unknown) => parse(deltaQuerySchema, q);
export const parsePushBody = (b: unknown) => parse(pushBodySchema, b);
export const parseDeviceBody = (b: unknown) => parse(deviceSchema, b);
export const parseDeviceIdParam = (p: unknown) => parse(deviceIdParamSchema, p).deviceId;
