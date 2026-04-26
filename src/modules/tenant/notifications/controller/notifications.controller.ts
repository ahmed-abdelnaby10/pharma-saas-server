import { Request, Response } from "express";
import { isTenantAuthContext } from "../../../../shared/types/auth.types";
import { ForbiddenError } from "../../../../shared/errors/forbidden-error";
import { notificationsService } from "../service/notifications.service";
import { mapNotificationResponse } from "../mapper/notifications.mapper";
import {
  parseQueryNotificationsDto,
  parseNotificationIdParam,
} from "../validators/notifications.validator";

class NotificationsController {
  list = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const query = parseQueryNotificationsDto(req.query);
    const notifications = await notificationsService.listNotifications(auth, query);
    res.json({ success: true, data: notifications.map(mapNotificationResponse) });
  };

  unreadCount = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const count = await notificationsService.getUnreadCount(auth);
    res.json({ success: true, data: { count } });
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const notificationId = parseNotificationIdParam(req.params);
    const notification = await notificationsService.markRead(auth, notificationId);
    res.json({ success: true, data: mapNotificationResponse(notification) });
  };

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    const auth = req.auth!;
    if (!isTenantAuthContext(auth)) throw new ForbiddenError();
    const result = await notificationsService.markAllRead(auth);
    res.json({ success: true, data: result });
  };
}

export const notificationsController = new NotificationsController();
