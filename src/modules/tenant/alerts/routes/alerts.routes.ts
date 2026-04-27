import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { alertsController } from "../controller/alerts.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(alertsController.all));
router.get("/low-stock", asyncHandler(alertsController.lowStock));
router.get("/expiring", asyncHandler(alertsController.expiring));
router.post("/notify", asyncHandler(alertsController.notify));

export { router as alertsRoutes };
