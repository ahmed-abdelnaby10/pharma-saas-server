import { z } from "zod";
import { ReleaseChannel } from "@prisma/client";

export const updateReleaseSchema = z.object({
  channel: z.nativeEnum(ReleaseChannel).optional(),
  notes: z.string().max(4000).optional(),
  windowsUrl: z.string().url().optional(),
  macUrl: z.string().url().optional(),
  linuxUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  publishedAt: z.string().datetime().optional(),
});

export type UpdateReleaseDto = z.infer<typeof updateReleaseSchema>;
