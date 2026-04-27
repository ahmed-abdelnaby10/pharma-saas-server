import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { idempotencyMiddleware } from "../../../../shared/middlewares/idempotency.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { stockMovementsController } from "../controller/stock-movements.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(stockMovementsController.list));

// idempotencyMiddleware ensures offline desktop clients can safely retry
// stock adjustments without duplicating quantity changes or movement records.
router.post(
  "/",
  asyncHandler(idempotencyMiddleware),
  asyncHandler(stockMovementsController.create),
);

export const stockMovementsRoutes = router;
