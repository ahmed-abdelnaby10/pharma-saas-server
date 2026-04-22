import { z } from "zod";
import { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { QuerySupportDto } from "../dto/query-support.dto";
import { UpdateTicketStatusDto, AssignTicketDto } from "../dto/update-ticket.dto";

const querySchema = z.object({
  tenantId: z.string().cuid().optional(),
  status: z.nativeEnum(SupportTicketStatus).optional(),
  priority: z.nativeEnum(SupportTicketPriority).optional(),
  category: z.nativeEnum(SupportTicketCategory).optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(SupportTicketStatus),
  resolutionNote: z.string().max(2000).optional(),
});

const assignSchema = z.object({
  assignedToId: z.string().cuid(),
});

const ticketIdSchema = z.object({ ticketId: z.string().cuid() });

export function parseQuerySupport(query: unknown): QuerySupportDto {
  const result = querySchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseUpdateTicketStatus(body: unknown): UpdateTicketStatusDto {
  const result = updateStatusSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseAssignTicket(body: unknown): AssignTicketDto {
  const result = assignSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseTicketIdParam(params: unknown): string {
  const result = ticketIdSchema.safeParse(params);
  if (!result.success) throw new BadRequestError("Invalid ticket ID");
  return result.data.ticketId;
}
