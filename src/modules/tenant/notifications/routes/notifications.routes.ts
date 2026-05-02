import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { notificationsController } from "../controller/notifications.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(notificationsController.list));
router.get("/unread-count", asyncHandler(notificationsController.unreadCount));
router.post("/read-all", asyncHandler(notificationsController.markAllRead));
router.patch("/:notificationId/read", asyncHandler(notificationsController.markRead));

export const notificationsRoutes = router;
