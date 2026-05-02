import { z } from "zod";
import { SignupRequestStatus } from "@prisma/client";

export const querySignupRequestsSchema = z.object({
  status: z.nativeEnum(SignupRequestStatus).optional(),
  search: z.string().trim().optional(),
});

export type QuerySignupRequestsDto = z.infer<typeof querySignupRequestsSchema>;
