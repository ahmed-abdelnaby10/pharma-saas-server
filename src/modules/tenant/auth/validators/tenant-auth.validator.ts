import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { TenantLoginDto } from "../dto/tenant-login.dto";

const tenantLoginSchema = z.object({
  slug: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().trim().min(1),
  rememberMe: z.boolean().default(false),
});

export const parseTenantLoginDto = (input: unknown): TenantLoginDto => {
  const result = tenantLoginSchema.parse(input);
  return {
    slug: result.slug.toLowerCase(),
    email: result.email.toLowerCase(),
    password: result.password,
    rememberMe: result.rememberMe,
  };
};

const deviceRefreshSchema = z.object({
  deviceToken: z.string().min(1),
});

export const parseDeviceRefreshDto = (input: unknown): { deviceToken: string } => {
  const result = deviceRefreshSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
};