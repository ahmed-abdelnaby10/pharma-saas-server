import { z } from "zod";
import { TenantLoginDto } from "../dto/tenant-login.dto";

const tenantLoginSchema = z.object({
  tenantId: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().trim().min(1),
});

export const parseTenantLoginDto = (input: unknown): TenantLoginDto => {
  const result = tenantLoginSchema.parse(input);
  return {
    tenantId: result.tenantId,
    email: result.email.toLowerCase(),
    password: result.password,
  };
};