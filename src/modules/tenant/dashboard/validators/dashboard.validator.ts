import { z } from "zod";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { QueryDashboardDto } from "../dto/query-dashboard.dto";

const queryDashboardSchema = z.object({
  branchId: z.string().cuid(),
});

export function parseQueryDashboard(query: unknown): QueryDashboardDto {
  const result = queryDashboardSchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}
