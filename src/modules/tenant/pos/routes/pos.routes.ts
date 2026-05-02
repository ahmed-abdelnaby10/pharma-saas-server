import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { idempotencyMiddleware } from "../../../../shared/middlewares/idempotency.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { posController } from "../controller/pos.controller";

const router = Router({ mergeParams: true });

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(posController.list));
// idempotencyMiddleware is applied here so offline desktop clients can safely
// retry sale creation without producing duplicate records.
router.post(
  "/",
  asyncHandler(idempotencyMiddleware),
  asyncHandler(posController.create),
);
router.get("/:saleId/receipt", asyncHandler(posController.receipt));
router.post("/:saleId/return", asyncHandler(posController.return));
router.get("/:saleId", asyncHandler(posController.get));

export { router as posRoutes };
