import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { subscriptionsController } from "../controller/subscriptions.controller";

// mergeParams: true so that :tenantId from the parent route is accessible
const router = Router({ mergeParams: true });

router.use(authMiddleware, platformMiddleware);

router.post("/", asyncHandler(subscriptionsController.create));
router.get("/", asyncHandler(subscriptionsController.list));
router.get("/current", asyncHandler(subscriptionsController.getCurrent));
router.post(
  "/current/change-plan",
  asyncHandler(subscriptionsController.changePlan),
);
router.post(
  "/current/cancel",
  asyncHandler(subscriptionsController.cancel),
);

export const subscriptionsRoutes = router;