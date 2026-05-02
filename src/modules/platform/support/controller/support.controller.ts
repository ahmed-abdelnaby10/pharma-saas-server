import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import {
  parseQuerySupport,
  parseUpdateTicketStatus,
  parseAssignTicket,
  parseTicketIdParam,
} from "../validators/support.validator";
import { mapTicketResponse } from "../mapper/support.mapper";
import { platformSupportService, PlatformSupportService } from "../service/support.service";

export class PlatformSupportController {
  constructor(private readonly service: PlatformSupportService) {}

  list = async (req: Request, res: Response) => {
    const query = parseQuerySupport(req.query);
    const tickets = await this.service.listTickets(query, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        tickets.map(mapTicketResponse),
        { count: tickets.length },
        req.requestId,
      ),
    );
  };

  getById = async (req: Request, res: Response) => {
    const ticketId = parseTicketIdParam(req.params);
    const ticket = await this.service.getTicket(ticketId, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", mapTicketResponse(ticket), undefined, req.requestId),
    );
  };

  updateStatus = async (req: Request, res: Response) => {
    const ticketId = parseTicketIdParam(req.params);
    const data = parseUpdateTicketStatus(req.body);
    const ticket = await this.service.updateStatus(ticketId, data, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("support.status_updated") || "Ticket status updated",
        mapTicketResponse(ticket),
        undefined,
        req.requestId,
      ),
    );
  };

  assign = async (req: Request, res: Response) => {
    const ticketId = parseTicketIdParam(req.params);
    const data = parseAssignTicket(req.body);
    const ticket = await this.service.assign(ticketId, data, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("support.assigned") || "Ticket assigned",
        mapTicketResponse(ticket),
        undefined,
        req.requestId,
      ),
    );
  };
}

export const platformSupportController = new PlatformSupportController(platformSupportService);
