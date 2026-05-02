import { z } from "zod";
import { ReleaseChannel } from "@prisma/client";

export const queryReleasesSchema = z.object({
  channel: z.nativeEnum(ReleaseChannel).optional(),
  isActive: z
    .preprocess((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      return v;
    }, z.boolean())
    .optional(),
});

export type QueryReleasesDto = z.infer<typeof queryReleasesSchema>;
