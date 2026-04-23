import { AuditLog, Prisma } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { AuditLogQueryDto } from "../validators/audit-logs.validator";

export type AuditLogRecord = AuditLog;

export class AuditLogsRepository {
  async findMany(query: AuditLogQueryDto): Promise<AuditLogRecord[]> {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.tenantId)  where.tenantId  = query.tenantId;
    if (query.actorId)   where.actorId   = query.actorId;
    if (query.actorType) where.actorType  = query.actorType;
    if (query.action)    where.action     = { contains: query.action, mode: "insensitive" };
    if (query.resource)  where.resource   = { contains: query.resource, mode: "insensitive" };

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo)   where.createdAt.lte = new Date(query.dateTo);
    }

    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  async findById(logId: string): Promise<AuditLogRecord | null> {
    return prisma.auditLog.findUnique({ where: { id: logId } });
  }
}

export const auditLogsRepository = new AuditLogsRepository();
