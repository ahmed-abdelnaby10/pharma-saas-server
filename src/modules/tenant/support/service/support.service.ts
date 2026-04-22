import { Translator } from "../../../../shared/types/locale.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { tenantSupportRepository } from "../repository/support.repository";
import { CreateTicketDto } from "../dto/create-ticket.dto";
import { TenantTicketRecord } from "../mapper/support.mapper";

export class TenantSupportService {
  async createTicket(
    tenantId: string,
    userId: string,
    data: CreateTicketDto,
    t: Translator,
  ): Promise<TenantTicketRecord> {
    return tenantSupportRepository.create({
      tenantId,
      submittedById: userId,
      subject: data.subject,
      description: data.description,
      category: data.category,
      priority: data.priority,
    });
  }

  async listTickets(tenantId: string, t: Translator): Promise<TenantTicketRecord[]> {
    return tenantSupportRepository.listByTenant(tenantId);
  }

  async getTicket(tenantId: string, ticketId: string, t: Translator): Promise<TenantTicketRecord> {
    const ticket = await tenantSupportRepository.findByTenantAndId(tenantId, ticketId);
    if (!ticket) throw new NotFoundError(t("support.not_found"));
    return ticket;
  }
}

export const tenantSupportService = new TenantSupportService();
