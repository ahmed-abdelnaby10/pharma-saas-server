import { z } from "zod";
import { ActorType } from "@prisma/client";

const querySchema = z.object({
  tenantId:  z.string().cuid().optional(),
  actorId:   z.string().optional(),
  actorType: z.nativeEnum(ActorType).optional(),
  action:    z.string().optional(),
  resource:  z.string().optional(),
  dateFrom:  z.string().datetime({ offset: true }).optional(),
  dateTo:    z.string().datetime({ offset: true }).optional(),
  cursor:    z.string().optional(),
  limit:     z.coerce.number().int().min(1).max(100).default(50),
});

const logIdParamSchema = z.object({
  logId: z.string().cuid("Invalid log ID"),
});

export type AuditLogQueryDto = z.infer<typeof querySchema>;

export function parseAuditLogQuery(raw: unknown): AuditLogQueryDto {
  return querySchema.parse(raw);
}

export function parseLogIdParam(raw: unknown): string {
  return logIdParamSchema.parse(raw).logId;
}
