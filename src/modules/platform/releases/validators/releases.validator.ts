import { z } from "zod";

const releaseIdParamSchema = z.object({
  id: z.string().min(1),
});

export function parseReleaseIdParam(params: unknown): string {
  return releaseIdParamSchema.parse(params).id;
}
