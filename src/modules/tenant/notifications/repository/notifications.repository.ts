import { Prisma, NotificationType } from "@prisma/client";
import { prisma } from "../../../../core/db/prisma";
import { NotificationRecord } from "../mapper/notifications.mapper";
import { QueryNotificationsDto } from "../dto/query-notifications.dto";

export class NotificationsRepository {
  async list(
    tenantId: string,
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<NotificationRecord[]> {
    const where: Prisma.NotificationWhereInput = {
      tenantId,
      userId,
      ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
      ...(query.cursor ? { createdAt: { lt: new Date(query.cursor) } } : {}),
    };

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 20,
    });
  }

  async countUnread(tenantId: string, userId: string): Promise<number> {
    return prisma.notification.count({
      where: { tenantId, userId, isRead: false },
    });
  }

  async findById(
    tenantId: string,
    userId: string,
    notificationId: string,
  ): Promise<NotificationRecord | null> {
    return prisma.notification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });
  }

  async create(data: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Prisma.InputJsonValue | null;
  }): Promise<NotificationRecord> {
    return prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        ...(data.metadata != null ? { metadata: data.metadata } : {}),
      },
    });
  }

  async markRead(notificationId: string): Promise<NotificationRecord> {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(tenantId: string, userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }
}

export const notificationsRepository = new NotificationsRepository();
