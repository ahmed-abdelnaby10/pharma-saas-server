import { SupportTicket, SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";

export type TenantTicketRecord = SupportTicket;

export interface TenantTicketResponse {
  id: string;
  subject: string;
  description: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapTenantTicketResponse(t: TenantTicketRecord): TenantTicketResponse {
  return {
    id: t.id,
    subject: t.subject,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    resolutionNote: t.resolutionNote,
    resolvedAt: t.resolvedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
