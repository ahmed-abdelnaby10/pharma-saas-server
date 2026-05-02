import { NotificationType } from "@prisma/client";
import { TenantAuthContext } from "../../../../shared/types/auth.types";
import { NotFoundError } from "../../../../shared/errors/not-found-error";
import { notificationsRepository } from "../repository/notifications.repository";
import { NotificationRecord } from "../mapper/notifications.mapper";
import { QueryNotificationsDto } from "../dto/query-notifications.dto";
import { CreateNotificationDto } from "../dto/create-notification.dto";

export class NotificationsService {
  /**
   * List notifications for the currently authenticated user.
   * Supports isRead filter and cursor-based pagination.
   */
  async listNotifications(
    auth: TenantAuthContext,
    query: QueryNotificationsDto,
  ): Promise<NotificationRecord[]> {
    return notificationsRepository.list(auth.tenantId, auth.userId, query);
  }

  async getUnreadCount(auth: TenantAuthContext): Promise<number> {
    return notificationsRepository.countUnread(auth.tenantId, auth.userId);
  }

  async markRead(auth: TenantAuthContext, notificationId: string): Promise<NotificationRecord> {
    const notification = await notificationsRepository.findById(
      auth.tenantId,
      auth.userId,
      notificationId,
    );
    if (!notification) {
      throw new NotFoundError("Notification not found", undefined, "notification.not_found");
    }
    if (notification.isRead) {
      return notification; // idempotent
    }
    return notificationsRepository.markRead(notificationId);
  }

  async markAllRead(auth: TenantAuthContext): Promise<{ count: number }> {
    const count = await notificationsRepository.markAllRead(auth.tenantId, auth.userId);
    return { count };
  }

  /**
   * Internal write path — called by other services (alerts, OCR worker, shift service, etc.)
   * to push a notification to a specific tenant user.
   */
  async notify(dto: CreateNotificationDto): Promise<NotificationRecord> {
    return notificationsRepository.create({
      tenantId: dto.tenantId,
      userId: dto.userId,
      type: dto.type ?? NotificationType.GENERAL,
      title: dto.title,
      body: dto.body,
      metadata: (dto.metadata as import("@prisma/client").Prisma.InputJsonValue) ?? null,
    });
  }
}

export const notificationsService = new NotificationsService();
