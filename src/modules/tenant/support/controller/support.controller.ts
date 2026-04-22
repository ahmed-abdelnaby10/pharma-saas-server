import { Request, Response } from "express";
import { successResponse } from "../../../../core/http/api-response";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { parseCreateTicketDto, parseTenantTicketIdParam } from "../validators/support.validator";
import { mapTenantTicketResponse } from "../mapper/support.mapper";
import { tenantSupportService, TenantSupportService } from "../service/support.service";

export class TenantSupportController {
  constructor(private readonly service: TenantSupportService) {}

  create = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const data = parseCreateTicketDto(req.body);
    const ticket = await this.service.createTicket(auth.tenantId, auth.userId, data, req.t!);
    return res.status(201).json(
      successResponse(
        req.t?.("support.created") || "Support ticket created",
        mapTenantTicketResponse(ticket),
        undefined,
        req.requestId,
      ),
    );
  };

  list = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const tickets = await this.service.listTickets(auth.tenantId, req.t!);
    return res.status(200).json(
      successResponse(
        req.t?.("common.ok") || "OK",
        tickets.map(mapTenantTicketResponse),
        { count: tickets.length },
        req.requestId,
      ),
    );
  };

  getById = async (req: Request, res: Response) => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const ticketId = parseTenantTicketIdParam(req.params);
    const ticket = await this.service.getTicket(auth.tenantId, ticketId, req.t!);
    return res.status(200).json(
      successResponse(req.t?.("common.ok") || "OK", mapTenantTicketResponse(ticket), undefined, req.requestId),
    );
  };
}

export const tenantSupportController = new TenantSupportController(tenantSupportService);
