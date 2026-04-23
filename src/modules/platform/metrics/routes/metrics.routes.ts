import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { platformMiddleware } from "../../../../shared/middlewares/platform.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { metricsController } from "../controller/metrics.controller";

const router = Router();

router.use(authMiddleware, platformMiddleware);

router.get("/overview", asyncHandler(metricsController.getOverview));
router.get("/tenants", asyncHandler(metricsController.getTenantMetrics));
router.get("/revenue", asyncHandler(metricsController.getRevenueMetrics));

export { router as metricsRoutes };
