import { AuditLogRecord, auditLogsRepository, AuditLogsRepository } from "../repository/audit-logs.repository";
import { AuditLogQueryDto } from "../validators/audit-logs.validator";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { Translator } from "../../../../shared/types/locale.types";

export class AuditLogsService {
  constructor(private readonly repo: AuditLogsRepository) {}

  async listLogs(query: AuditLogQueryDto): Promise<AuditLogRecord[]> {
    return this.repo.findMany(query);
  }

  async getLog(logId: string, t: Translator): Promise<AuditLogRecord> {
    const log = await this.repo.findById(logId);
    if (!log) throw new NotFoundError(t("audit.not_found"));
    return log;
  }
}

export const auditLogsService = new AuditLogsService(auditLogsRepository);
