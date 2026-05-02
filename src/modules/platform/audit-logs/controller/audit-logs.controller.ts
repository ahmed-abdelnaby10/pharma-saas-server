import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { parseAuditLogQuery, parseLogIdParam } from "../validators/audit-logs.validator";
import { auditLogsService, AuditLogsService } from "../service/audit-logs.service";
import { AuditLogRecord } from "../repository/audit-logs.repository";

function mapLog(log: AuditLogRecord) {
  return {
    id:         log.id,
    tenantId:   log.tenantId,
    actorId:    log.actorId,
    actorType:  log.actorType,
    action:     log.action,
    resource:   log.resource,
    resourceId: log.resourceId,
    metadata:   log.metadata,
    ipAddress:  log.ipAddress,
    createdAt:  log.createdAt,
  };
}

export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  list = async (req: Request, res: Response) => {
    const query = parseAuditLogQuery(req.query);
    const logs = await this.service.listLogs(query);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        logs.map(mapLog),
        { count: logs.length, nextCursor: logs.length === query.limit ? logs[logs.length - 1]?.id : null },
        req.requestId,
      ),
    );
  };

  getById = async (req: Request, res: Response) => {
    const logId = parseLogIdParam(req.params);
    const log = await this.service.getLog(logId, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        mapLog(log),
        undefined,
        req.requestId,
      ),
    );
  };
}

export const auditLogsController = new AuditLogsController(auditLogsService);
