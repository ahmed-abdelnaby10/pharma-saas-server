import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { reportsController } from "../controller/reports.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/shift-summary", asyncHandler(reportsController.shiftSummary));
router.get("/daily-sales", asyncHandler(reportsController.dailySales));
router.get("/stock-valuation", asyncHandler(reportsController.stockValuation));

export { router as reportsRoutes };
