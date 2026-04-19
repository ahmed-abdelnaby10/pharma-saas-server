import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { stockMovementsController } from "../controller/stock-movements.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(stockMovementsController.list));
router.post("/", asyncHandler(stockMovementsController.create));

export const stockMovementsRoutes = router;
