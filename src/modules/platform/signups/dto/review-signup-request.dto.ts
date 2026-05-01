import { z } from "zod";

export const rejectSignupRequestSchema = z.object({
  rejectionReason: z.string().min(5).max(500),
});

export type RejectSignupRequestDto = z.infer<typeof rejectSignupRequestSchema>;
