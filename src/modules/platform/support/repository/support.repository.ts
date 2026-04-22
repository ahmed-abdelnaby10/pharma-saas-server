import { SupportTicketStatus } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { QuerySupportDto } from "../dto/query-support.dto";
import { TicketRecord } from "../mapper/support.mapper";

export class PlatformSupportRepository {
  async list(query: QuerySupportDto): Promise<TicketRecord[]> {
    return prisma.supportTicket.findMany({
      where: {
        ...(query.tenantId ? { tenantId: query.tenantId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.priority ? { priority: query.priority } : {}),
        ...(query.category ? { category: query.category } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async findById(ticketId: string): Promise<TicketRecord | null> {
    return prisma.supportTicket.findUnique({ where: { id: ticketId } });
  }

  async updateStatus(
    ticketId: string,
    status: SupportTicketStatus,
    resolutionNote?: string,
  ): Promise<TicketRecord> {
    const isResolved =
      status === SupportTicketStatus.RESOLVED || status === SupportTicketStatus.CLOSED;
    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        ...(resolutionNote !== undefined ? { resolutionNote } : {}),
        ...(isResolved ? { resolvedAt: new Date() } : {}),
      },
    });
  }

  async assign(ticketId: string, assignedToId: string): Promise<TicketRecord> {
    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedToId, status: SupportTicketStatus.IN_PROGRESS },
    });
  }
}

export const platformSupportRepository = new PlatformSupportRepository();
