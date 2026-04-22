import { Translator } from "../../../../shared/types/locale.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { platformSupportRepository } from "../repository/support.repository";
import { QuerySupportDto } from "../dto/query-support.dto";
import { UpdateTicketStatusDto, AssignTicketDto } from "../dto/update-ticket.dto";
import { TicketRecord } from "../mapper/support.mapper";

export class PlatformSupportService {
  async listTickets(query: QuerySupportDto, t: Translator): Promise<TicketRecord[]> {
    return platformSupportRepository.list(query);
  }

  async getTicket(ticketId: string, t: Translator): Promise<TicketRecord> {
    const ticket = await platformSupportRepository.findById(ticketId);
    if (!ticket) throw new NotFoundError(t("support.not_found"));
    return ticket;
  }

  async updateStatus(
    ticketId: string,
    data: UpdateTicketStatusDto,
    t: Translator,
  ): Promise<TicketRecord> {
    const ticket = await platformSupportRepository.findById(ticketId);
    if (!ticket) throw new NotFoundError(t("support.not_found"));
    return platformSupportRepository.updateStatus(ticketId, data.status, data.resolutionNote);
  }

  async assign(ticketId: string, data: AssignTicketDto, t: Translator): Promise<TicketRecord> {
    const ticket = await platformSupportRepository.findById(ticketId);
    if (!ticket) throw new NotFoundError(t("support.not_found"));
    return platformSupportRepository.assign(ticketId, data.assignedToId);
  }
}

export const platformSupportService = new PlatformSupportService();
