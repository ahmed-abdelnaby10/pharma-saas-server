import { z } from "zod";
import { ReleaseChannel } from "@prisma/client";

export const createReleaseSchema = z.object({
  version: z.string().min(1).max(32).regex(/^\d+\.\d+\.\d+/, {
    message: "version must follow semver (e.g. 1.2.3)",
  }),
  channel: z.nativeEnum(ReleaseChannel).default("STABLE"),
  notes: z.string().max(4000).optional(),
  windowsUrl: z.string().url().optional(),
  macUrl: z.string().url().optional(),
  linuxUrl: z.string().url().optional(),
  publishedAt: z.string().datetime().optional(),
});

export type CreateReleaseDto = z.infer<typeof createReleaseSchema>;
