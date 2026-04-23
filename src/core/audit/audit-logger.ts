import { ActorType, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { logger } from "../logger/logger";

export interface AuditLogPayload {
  tenantId?: string;
  actorId: string;
  actorType: ActorType;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Fire-and-forget audit log writer.
 * Errors are swallowed so audit failures never break the main request flow.
 */
export function logAudit(payload: AuditLogPayload): void {
  prisma.auditLog
    .create({
      data: {
        tenantId: payload.tenantId ?? null,
        actorId: payload.actorId,
        actorType: payload.actorType,
        action: payload.action,
        resource: payload.resource,
        resourceId: payload.resourceId ?? null,
        metadata: (payload.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ipAddress: payload.ipAddress ?? null,
      },
    })
    .catch((err: unknown) => {
      logger.error("audit-logger: failed to write audit log", {
        error: err instanceof Error ? err.message : String(err),
        payload,
      });
    });
}
