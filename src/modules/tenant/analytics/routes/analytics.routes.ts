import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { analyticsController } from "../controller/analytics.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/top-items", asyncHandler(analyticsController.topItems));
router.get("/revenue-trend", asyncHandler(analyticsController.revenueTrend));
router.get("/payment-methods", asyncHandler(analyticsController.paymentMethods));

export { router as analyticsRoutes };
