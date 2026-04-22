import { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";

export interface QuerySupportDto {
  tenantId?: string;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  category?: SupportTicketCategory;
}
