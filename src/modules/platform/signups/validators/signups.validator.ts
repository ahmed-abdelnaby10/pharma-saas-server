import { z } from "zod";

const signupIdParamSchema = z.object({
  id: z.string().min(1),
});

export function parseSignupIdParam(params: unknown): string {
  return signupIdParamSchema.parse(params).id;
}
