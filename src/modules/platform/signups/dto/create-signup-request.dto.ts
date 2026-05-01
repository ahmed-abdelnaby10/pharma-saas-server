import { z } from "zod";

export const createSignupRequestSchema = z.object({
  planId: z.string().min(1),
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().trim().optional(),
  pharmacyNameEn: z.string().min(2).max(120),
  pharmacyNameAr: z.string().min(2).max(120),
  notes: z.string().max(1000).optional(),
});

export type CreateSignupRequestDto = z.infer<typeof createSignupRequestSchema>;
