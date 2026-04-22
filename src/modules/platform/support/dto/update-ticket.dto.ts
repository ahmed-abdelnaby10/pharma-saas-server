import { SupportTicketStatus } from "@prisma/client";

export interface UpdateTicketStatusDto {
  status: SupportTicketStatus;
  resolutionNote?: string;
}

export interface AssignTicketDto {
  assignedToId: string;
}
