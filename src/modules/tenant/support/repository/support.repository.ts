import { SupportTicketCategory, SupportTicketPriority } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { TenantTicketRecord } from "../mapper/support.mapper";

export class TenantSupportRepository {
  async create(data: {
    tenantId: string;
    submittedById: string;
    subject: string;
    description: string;
    category?: SupportTicketCategory;
    priority?: SupportTicketPriority;
  }): Promise<TenantTicketRecord> {
    return prisma.supportTicket.create({ data });
  }

  async listByTenant(tenantId: string): Promise<TenantTicketRecord[]> {
    return prisma.supportTicket.findMany({
      where: { tenantId },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async findByTenantAndId(tenantId: string, ticketId: string): Promise<TenantTicketRecord | null> {
    return prisma.supportTicket.findFirst({ where: { id: ticketId, tenantId } });
  }
}

export const tenantSupportRepository = new TenantSupportRepository();
