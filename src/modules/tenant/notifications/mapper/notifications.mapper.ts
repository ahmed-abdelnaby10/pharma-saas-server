import { Notification, NotificationType } from "@prisma/client";

export type NotificationRecord = Notification;

export interface NotificationResponse {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export function mapNotificationResponse(n: NotificationRecord): NotificationResponse {
  return {
    id: n.id,
    tenantId: n.tenantId,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    metadata: (n.metadata as Record<string, unknown> | null) ?? null,
    isRead: n.isRead,
    readAt: n.readAt ?? null,
    createdAt: n.createdAt,
  };
}
