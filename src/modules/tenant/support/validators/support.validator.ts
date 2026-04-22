import { z } from "zod";
import { SupportTicketCategory, SupportTicketPriority } from "@prisma/client";
import { ValidationError } from "../../../../shared/errors/validation-error";
import { BadRequestError } from "../../../../shared/errors/bad-request-error";
import { CreateTicketDto } from "../dto/create-ticket.dto";

const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  category: z.nativeEnum(SupportTicketCategory).optional(),
  priority: z.nativeEnum(SupportTicketPriority).optional(),
});

const ticketIdSchema = z.object({ ticketId: z.string().cuid() });

export function parseCreateTicketDto(body: unknown): CreateTicketDto {
  const result = createTicketSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten().fieldErrors);
  }
  return result.data;
}

export function parseTenantTicketIdParam(params: unknown): string {
  const result = ticketIdSchema.safeParse(params);
  if (!result.success) throw new BadRequestError("Invalid ticket ID");
  return result.data.ticketId;
}
