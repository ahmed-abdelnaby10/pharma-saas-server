import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { permissionMiddleware } from "../../../../shared/middlewares/permission.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { reportsController } from "../controller/reports.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/shift-summary",   permissionMiddleware(["reports:read"]), asyncHandler(reportsController.shiftSummary));
router.get("/daily-sales",     permissionMiddleware(["reports:read"]), asyncHandler(reportsController.dailySales));
router.get("/stock-valuation", permissionMiddleware(["reports:read"]), asyncHandler(reportsController.stockValuation));

export { router as reportsRoutes };
