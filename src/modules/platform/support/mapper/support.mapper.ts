import { SupportTicket, SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";

export type TicketRecord = SupportTicket;

export interface TicketResponse {
  id: string;
  tenantId: string;
  submittedById: string;
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedToId: string | null;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapTicketResponse(t: TicketRecord): TicketResponse {
  return {
    id: t.id,
    tenantId: t.tenantId,
    submittedById: t.submittedById,
    subject: t.subject,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    assignedToId: t.assignedToId,
    resolutionNote: t.resolutionNote,
    resolvedAt: t.resolvedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
