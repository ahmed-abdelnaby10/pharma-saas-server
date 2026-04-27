import { NotificationType } from "@prisma/client";

export interface CreateNotificationDto {
  tenantId: string;
  userId: string;
  type?: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
}
