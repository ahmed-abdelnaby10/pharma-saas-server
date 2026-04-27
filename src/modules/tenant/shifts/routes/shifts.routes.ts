import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/auth.middleware";
import { tenantMiddleware } from "../../../../shared/middlewares/tenant.middleware";
import { idempotencyMiddleware } from "../../../../shared/middlewares/idempotency.middleware";
import { asyncHandler } from "../../../../shared/utils/async-handler";
import { shiftsController } from "../controller/shifts.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", asyncHandler(shiftsController.list));
router.get("/active", asyncHandler(shiftsController.getActive));

// idempotencyMiddleware ensures offline desktop clients can safely retry
// shift creation without opening a duplicate shift.
router.post(
  "/",
  asyncHandler(idempotencyMiddleware),
  asyncHandler(shiftsController.open),
);

router.get("/:shiftId", asyncHandler(shiftsController.get));

// idempotencyMiddleware ensures desktop retries of shift-close are safe.
// Service-level: already-closed shifts return the closed record, not an error.
router.post(
  "/:shiftId/close",
  asyncHandler(idempotencyMiddleware),
  asyncHandler(shiftsController.close),
);

export const shiftsRoutes = router;
