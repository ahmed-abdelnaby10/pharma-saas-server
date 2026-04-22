import { SupportTicketCategory, SupportTicketPriority } from "@prisma/client";

export interface CreateTicketDto {
  subject: string;
  description: string;
  category?: SupportTicketCategory;
  priority?: SupportTicketPriority;
}
